import type {
  DocsRunbookEvidencePresetState,
  GeneratorState,
  PolicyDraft,
  QuickStartPolicyPresetId,
  QuickStartPresetId,
  QuickStartState,
  ReleaseSafetyPresetState,
  SensitivePathsPresetState,
  TestsForSourceChangesPresetState,
  TitleFormatPresetState,
  WorkflowOptions,
} from './types';
import { POLICY_ACTION_SHA } from './action-refs';

export interface QuickStartPresetMeta {
  id: QuickStartPresetId;
  title: string;
  description: string;
  isMacro?: boolean;
}

export const QUICK_START_PRESET_ORDER: QuickStartPresetId[] = [
  'safe-default',
  'title-format',
  'pr-body-required',
  'tests-for-source-changes',
  'sensitive-paths',
  'release-safety',
  'docs-runbook-evidence',
];

export const QUICK_START_CORE_PRESET_IDS: QuickStartPolicyPresetId[] = [
  'title-format',
  'pr-body-required',
  'tests-for-source-changes',
  'sensitive-paths',
  'release-safety',
];

export const QUICK_START_PRESET_META: Record<
  QuickStartPresetId,
  QuickStartPresetMeta
> = {
  'safe-default': {
    id: 'safe-default',
    title: 'Safe default',
    description:
      'Legacy macro: enable the core policy templates together. Review each template before using it for your repository.',
    isMacro: true,
  },
  'title-format': {
    id: 'title-format',
    title: 'Title format',
    description:
      'Require conventional PR titles that are readable in review queues and release notes.',
  },
  'pr-body-required': {
    id: 'pr-body-required',
    title: 'PR body required',
    description:
      'Block empty pull request descriptions so reviewers get basic intent and context.',
  },
  'tests-for-source-changes': {
    id: 'tests-for-source-changes',
    title: 'Tests for source changes',
    description:
      'Require test evidence whenever product code changes in core source directories.',
  },
  'sensitive-paths': {
    id: 'sensitive-paths',
    title: 'Sensitive paths',
    description:
      'Require stronger review on workflows, infra, auth, secrets, and deployment paths.',
  },
  'release-safety': {
    id: 'release-safety',
    title: 'Release safety',
    description:
      'Require rollout and rollback notes when risky delivery or operational paths change.',
  },
  'docs-runbook-evidence': {
    id: 'docs-runbook-evidence',
    title: 'Docs/runbook evidence',
    description:
      'Require visible documentation or runbook updates for operational changes.',
  },
};

export function createDefaultWorkflowOptions(): WorkflowOptions {
  return {
    actionRef: POLICY_ACTION_SHA,
    failOnWarn: false,
    configPath: '.github/pull-request-policy.yml',
  };
}

function createTitleFormatPresetState(): TitleFormatPresetState {
  return {
    enabled: true,
    severity: 'error',
    patterns: ['^(feat|fix|docs|refactor|test|chore|ci|security): .+'],
    message:
      'PR title must start with feat:, fix:, docs:, refactor:, test:, chore:, ci:, or security:.',
  };
}

function createPrBodyRequiredPresetState(): QuickStartState['presets']['pr-body-required'] {
  return {
    enabled: true,
    severity: 'error',
    patterns: ['\\S'],
    message: 'PR body is required.',
  };
}

function createTestsForSourceChangesPresetState(): TestsForSourceChangesPresetState {
  return {
    enabled: true,
    severity: 'error',
    sourceGlobs: ['src/**', 'app/**', 'lib/**', 'packages/**'],
    testGlobs: ['test/**', 'tests/**', '**/*.test.*', '**/*.spec.*'],
    message: 'Source changes must include tests.',
  };
}

function createSensitivePathsPresetState(): SensitivePathsPresetState {
  return {
    enabled: true,
    severity: 'error',
    globs: [],
    approvals: 2,
    message: 'Sensitive path changes require at least 2 trusted approvals.',
  };
}

function createReleaseSafetyPresetState(): ReleaseSafetyPresetState {
  return {
    enabled: true,
    severity: 'error',
    globs: [
      '.github/workflows/**',
      'infra/**',
      'deploy/**',
      'deployment/**',
      'ops/**',
    ],
    rolloutPatterns: ['rollout'],
    rollbackPatterns: ['rollback'],
    message:
      'Risky workflow and operational changes must mention rollout and rollback in the PR body.',
  };
}

function createDocsRunbookEvidencePresetState(): DocsRunbookEvidencePresetState {
  return {
    enabled: true,
    severity: 'warn',
    globs: [
      '.github/workflows/**',
      'infra/**',
      'deploy/**',
      'deployment/**',
      'ops/**',
    ],
    evidenceGlobs: ['docs/**', 'runbooks/**', 'operations/**'],
    message:
      'Operational changes should include docs, runbook, or operations updates.',
  };
}

export function createDefaultQuickStartState(): QuickStartState {
  return {
    presets: {
      'safe-default': { enabled: false },
      'title-format': { ...createTitleFormatPresetState(), enabled: false },
      'pr-body-required': createPrBodyRequiredPresetState(),
      'tests-for-source-changes': {
        ...createTestsForSourceChangesPresetState(),
        enabled: false,
      },
      'sensitive-paths': {
        ...createSensitivePathsPresetState(),
        enabled: false,
      },
      'release-safety': { ...createReleaseSafetyPresetState(), enabled: false },
      'docs-runbook-evidence': {
        ...createDocsRunbookEvidencePresetState(),
        enabled: false,
      },
    },
  };
}

export function createEmptyPolicyDraft(sequence: number): PolicyDraft {
  return {
    uid: `policy-${sequence}`,
    id: `custom-policy-${sequence}`,
    description: '',
    severity: 'error',
    message: '',
  };
}

export function createDefaultGeneratorState(): GeneratorState {
  return {
    mode: 'quick-start',
    workflow: createDefaultWorkflowOptions(),
    quickStart: createDefaultQuickStartState(),
    advanced: {
      policies: [],
      nextPolicyNumber: 1,
    },
  };
}

export function setSafeDefaultEnabled(
  state: QuickStartState,
  enabled: boolean,
): QuickStartState {
  return {
    presets: {
      ...state.presets,
      'safe-default': { enabled },
      'title-format': {
        ...state.presets['title-format'],
        enabled,
      },
      'pr-body-required': {
        ...state.presets['pr-body-required'],
        enabled,
      },
      'tests-for-source-changes': {
        ...state.presets['tests-for-source-changes'],
        enabled,
      },
      'sensitive-paths': {
        ...state.presets['sensitive-paths'],
        enabled,
      },
      'release-safety': {
        ...state.presets['release-safety'],
        enabled,
      },
    },
  };
}

export function syncSafeDefaultEnabled(
  state: QuickStartState,
): QuickStartState {
  const enabled = QUICK_START_CORE_PRESET_IDS.every(
    (presetId) => state.presets[presetId].enabled,
  );

  if (state.presets['safe-default'].enabled === enabled) {
    return state;
  }

  return {
    presets: {
      ...state.presets,
      'safe-default': { enabled },
    },
  };
}
