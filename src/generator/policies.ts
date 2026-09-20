import type { Policy } from '../config/schema';
import type {
  GeneratorOutput,
  GeneratorState,
  NormalizedPolicyResult,
  PolicyDraft,
  QuickStartPolicyPresetId,
  QuickStartState,
  ValidationError,
} from './types';
import { normalizeExpressionDraft } from './expressions';
import { generateWorkflowYaml } from './workflow';
import { dumpYaml } from './yaml';

function trimValues(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function createPolicy(
  input: Omit<Policy, 'description' | 'when'> & {
    description?: string;
    when?: Policy['when'];
  },
): Policy {
  const policy: Record<string, unknown> = {
    id: input.id,
    severity: input.severity,
    require: input.require,
    message: input.message,
  };
  if (input.description) {
    policy.description = input.description;
  }
  if (input.when) {
    policy.when = input.when;
  }
  return policy as unknown as Policy;
}

export function buildQuickStartPolicyMap(
  state: QuickStartState,
): Partial<Record<QuickStartPolicyPresetId, Policy>> {
  const policies: Partial<Record<QuickStartPolicyPresetId, Policy>> = {};
  const titleFormat = state.presets['title-format'];
  if (titleFormat.enabled) {
    policies['title-format'] = createPolicy({
      id: 'title-format',
      severity: titleFormat.severity,
      require: {
        title: trimValues(titleFormat.patterns),
      },
      message: titleFormat.message.trim(),
    });
  }

  const prBodyRequired = state.presets['pr-body-required'];
  if (prBodyRequired.enabled) {
    policies['pr-body-required'] = createPolicy({
      id: 'pr-body-required',
      severity: prBodyRequired.severity,
      require: {
        body: trimValues(prBodyRequired.patterns),
      },
      message: prBodyRequired.message.trim(),
    });
  }

  const testsForSourceChanges = state.presets['tests-for-source-changes'];
  if (testsForSourceChanges.enabled) {
    policies['tests-for-source-changes'] = createPolicy({
      id: 'tests-for-source-changes',
      severity: testsForSourceChanges.severity,
      when: {
        changed: trimValues(testsForSourceChanges.sourceGlobs),
      },
      require: {
        changed: trimValues(testsForSourceChanges.testGlobs),
      },
      message: testsForSourceChanges.message.trim(),
    });
  }

  const sensitivePaths = state.presets['sensitive-paths'];
  if (sensitivePaths.enabled && trimValues(sensitivePaths.globs).length > 0) {
    policies['sensitive-paths'] = createPolicy({
      id: 'sensitive-paths',
      severity: sensitivePaths.severity,
      when: {
        changed: trimValues(sensitivePaths.globs),
      },
      require: {
        approval_count_at_least: sensitivePaths.approvals,
      },
      message: sensitivePaths.message.trim(),
    });
  }

  const releaseSafety = state.presets['release-safety'];
  if (releaseSafety.enabled) {
    policies['release-safety'] = createPolicy({
      id: 'release-safety',
      severity: releaseSafety.severity,
      when: {
        changed: trimValues(releaseSafety.globs),
      },
      require: {
        all: [
          { body: trimValues(releaseSafety.rolloutPatterns) },
          { body: trimValues(releaseSafety.rollbackPatterns) },
        ],
      },
      message: releaseSafety.message.trim(),
    });
  }

  const docsRunbookEvidence = state.presets['docs-runbook-evidence'];
  if (docsRunbookEvidence.enabled) {
    policies['docs-runbook-evidence'] = createPolicy({
      id: 'docs-runbook-evidence',
      severity: docsRunbookEvidence.severity,
      when: {
        changed: trimValues(docsRunbookEvidence.globs),
      },
      require: {
        changed: trimValues(docsRunbookEvidence.evidenceGlobs),
      },
      message: docsRunbookEvidence.message.trim(),
    });
  }

  return policies;
}

export function buildQuickStartPolicies(state: QuickStartState): Policy[] {
  const policies = buildQuickStartPolicyMap(state);
  const orderedIds: QuickStartPolicyPresetId[] = [
    'title-format',
    'pr-body-required',
    'tests-for-source-changes',
    'sensitive-paths',
    'release-safety',
    'docs-runbook-evidence',
  ];

  return orderedIds.flatMap((policyId) => {
    const policy = policies[policyId];
    return policy ? [policy] : [];
  });
}

function buildQuickStartPoliciesFromState(state: QuickStartState): Policy[] {
  const policies = buildQuickStartPolicies(state);
  return policies;
}

function validateQuickStartPolicies(policies: Policy[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set<string>();
  policies.forEach((policy, index) => {
    if (policy.id.trim().length === 0) {
      errors.push({
        path: `policies[${index}].id`,
        message: 'Policy id cannot be empty.',
      });
    }
    if (ids.has(policy.id)) {
      errors.push({
        path: `policies[${index}].id`,
        message: `Duplicate policy id "${policy.id}".`,
      });
    }
    ids.add(policy.id);
    if (policy.message.trim().length === 0) {
      errors.push({
        path: `policies[${index}].message`,
        message: 'Policy message cannot be empty.',
      });
    }
  });

  return errors;
}

function normalizePolicyDraft(
  draft: PolicyDraft,
  index: number,
): { policy?: Policy; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const id = draft.id.trim();
  const description = draft.description.trim();
  const message = draft.message.trim();

  if (id.length === 0) {
    errors.push({
      path: `policies[${index}].id`,
      message: 'Policy id is required.',
    });
  }

  if (message.length === 0) {
    errors.push({
      path: `policies[${index}].message`,
      message: 'Policy message is required.',
    });
  }

  const requireResult = normalizeExpressionDraft(
    draft.require,
    `policies[${index}].require`,
  );
  errors.push(...requireResult.errors);

  let whenExpression;
  if (draft.when) {
    const whenResult = normalizeExpressionDraft(
      draft.when,
      `policies[${index}].when`,
    );
    errors.push(...whenResult.errors);
    whenExpression = whenResult.expression;
  }

  if (errors.length > 0 || !requireResult.expression) {
    return { errors };
  }

  const policyInput: Parameters<typeof createPolicy>[0] = {
    id,
    severity: draft.severity,
    require: requireResult.expression,
    message,
  };
  if (description.length > 0) {
    policyInput.description = description;
  }
  if (whenExpression) {
    policyInput.when = whenExpression;
  }

  return {
    policy: createPolicy(policyInput),
    errors: [],
  };
}

export function normalizeAdvancedPolicies(
  drafts: PolicyDraft[],
): NormalizedPolicyResult {
  const policies: Policy[] = [];
  const errors: ValidationError[] = [];
  const ids = new Set<string>();

  drafts.forEach((draft, index) => {
    const result = normalizePolicyDraft(draft, index);
    errors.push(...result.errors);
    if (!result.policy) {
      return;
    }
    if (ids.has(result.policy.id)) {
      errors.push({
        path: `policies[${index}].id`,
        message: `Duplicate policy id "${result.policy.id}".`,
      });
      return;
    }
    ids.add(result.policy.id);
    policies.push(result.policy);
  });

  return errors.length > 0 ? { errors } : { policies, errors: [] };
}

export function generatePolicyYaml(policies: Policy[]): string {
  const compactPolicies = Object.fromEntries(
    policies.map((policy) => {
      const output: Record<string, unknown> = {};
      if (policy.description) output.description = policy.description;
      if (policy.severity !== 'error') output.severity = policy.severity;
      if (policy.when) output.when = compactExpression(policy.when);
      if ('approval_count_at_least' in policy.require) {
        output.approvals = policy.require.approval_count_at_least;
      } else {
        output.require = compactExpression(policy.require);
      }
      return [policy.id, output];
    }),
  );
  return dumpYaml({ policies: compactPolicies });
}

function compactExpression(expression: Policy['require']): unknown {
  if ('has_label' in expression) return { label: expression.has_label };
  if ('approval_count_at_least' in expression) {
    return { approvals: expression.approval_count_at_least };
  }
  if ('all' in expression || 'any' in expression) {
    if ('all' in expression) {
      return { all: expression.all.map(compactExpression) };
    }
    return { any: expression.any.map(compactExpression) };
  }
  if ('not' in expression) return { not: compactExpression(expression.not) };
  return expression;
}

function generateInvalidPolicyYaml(errors: ValidationError[]): string {
  const lines = ['# Fix validation errors to generate policy YAML.'];
  errors.forEach((error) => {
    lines.push(`# ${error.path}: ${error.message}`);
  });
  return `${lines.join('\n')}\n`;
}

export function generateOutput(state: GeneratorState): GeneratorOutput {
  const workflowYaml = generateWorkflowYaml(state.workflow);
  if (state.mode === 'quick-start') {
    const policies = buildQuickStartPoliciesFromState(state.quickStart);
    const errors = validateQuickStartPolicies(policies);
    return {
      workflowYaml,
      policyYaml:
        errors.length === 0
          ? generatePolicyYaml(policies)
          : generateInvalidPolicyYaml(errors),
      errors,
      ...(errors.length === 0 ? { policyConfig: { policies } } : {}),
    };
  }

  const advanced = normalizeAdvancedPolicies(state.advanced.policies);
  return {
    workflowYaml,
    policyYaml:
      advanced.errors.length === 0 && advanced.policies
        ? generatePolicyYaml(advanced.policies)
        : generateInvalidPolicyYaml(advanced.errors),
    errors: advanced.errors,
    ...(advanced.policies
      ? { policyConfig: { policies: advanced.policies } }
      : {}),
  };
}
