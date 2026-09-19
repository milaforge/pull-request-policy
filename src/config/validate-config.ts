import type {
  Policy,
  PolicyConfig,
  PredicateExpression,
  Severity,
} from './schema';

const TOP_LEVEL_KEYS = new Set(['policies']);
const POLICY_KEYS = new Set([
  'id',
  'description',
  'severity',
  'when',
  'require',
  'message',
]);
const COMPACT_POLICY_KEYS = new Set(['when', 'approvals']);
const FILE_CONTAINS_KEYS = new Set(['globs', 'patterns']);
const PREDICATE_KEYS = [
  'changed',
  'exists',
  'body',
  'title',
  'has_label',
  'approval_count_at_least',
  'file_contains',
  'all',
  'any',
  'not',
] as const;

export function validateConfig(config: unknown): PolicyConfig {
  const record = asRecord(config, 'config');
  rejectUnknownKeys(record, TOP_LEVEL_KEYS, 'config');
  return {
    policies: readPolicies(record['policies']),
  };
}

function readPolicies(value: unknown): Policy[] {
  if (Array.isArray(value)) {
    return value.map((policy, index) =>
      readPolicy(policy, `config.policies[${index}]`),
    );
  }
  const record = asRecord(value, 'config.policies');
  return Object.entries(record).map(([id, policy], index) =>
    readCompactPolicy(id, policy, `config.policies.${id || index}`),
  );
}

function readCompactPolicy(id: string, value: unknown, scope: string): Policy {
  const record = asRecord(value, scope);
  rejectUnknownKeys(record, COMPACT_POLICY_KEYS, scope);
  const approvals = readNonNegativeInteger(
    record['approvals'],
    `${scope}.approvals`,
  );
  const when = readCompactWhen(record['when'], `${scope}.when`);
  return {
    id: readNonEmptyString(id, `${scope} policy id`),
    severity: 'error',
    when,
    require: { approval_count_at_least: approvals },
    message: `Policy "${id}" requires at least ${approvals} trusted approval${approvals === 1 ? '' : 's'}.`,
  };
}

function readCompactWhen(value: unknown, scope: string): PredicateExpression {
  const record = asRecord(value, scope);
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== 'changed') {
    throw new Error(`${scope} must contain only a changed glob`);
  }
  return {
    changed: [readNonEmptyString(record['changed'], `${scope}.changed`)],
  };
}

function readPolicy(value: unknown, scope: string): Policy {
  const record = asRecord(value, scope);
  rejectUnknownKeys(record, POLICY_KEYS, scope);
  const description = readOptionalNonEmptyString(
    record['description'],
    `${scope}.description`,
  );
  const when = readOptionalPredicate(record['when'], `${scope}.when`);
  const policy: Policy = {
    id: readNonEmptyString(record['id'], `${scope}.id`),
    severity: readSeverity(record['severity'], `${scope}.severity`),
    require: readPredicate(record['require'], `${scope}.require`),
    message: readNonEmptyString(record['message'], `${scope}.message`),
  };
  if (description !== undefined) {
    policy.description = description;
  }
  if (when !== undefined) {
    policy.when = when;
  }
  return policy;
}

function readSeverity(value: unknown, scope: string): Severity {
  if (value === 'error' || value === 'warn') {
    return value;
  }
  throw new Error(`${scope} must be "error" or "warn"`);
}

function readOptionalPredicate(
  value: unknown,
  scope: string,
): PredicateExpression | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readPredicate(value, scope);
}

function readPredicate(value: unknown, scope: string): PredicateExpression {
  const record = asRecord(value, scope);
  const keys = Object.keys(record);
  if (keys.length !== 1) {
    throw new Error(
      `${scope} must contain exactly one predicate or combinator`,
    );
  }
  const key = keys[0];
  if (
    key === undefined ||
    !PREDICATE_KEYS.includes(key as (typeof PREDICATE_KEYS)[number])
  ) {
    throw new Error(`${scope} uses an unknown predicate key`);
  }
  const predicateValue = record[key];
  switch (key) {
    case 'changed':
    case 'exists':
    case 'body':
    case 'title':
    case 'has_label':
      return {
        [key]: readStringArray(predicateValue, `${scope}.${key}`),
      } as PredicateExpression;
    case 'approval_count_at_least':
      return {
        approval_count_at_least: readNonNegativeInteger(
          predicateValue,
          `${scope}.approval_count_at_least`,
        ),
      };
    case 'file_contains':
      return {
        file_contains: readFileContains(
          predicateValue,
          `${scope}.file_contains`,
        ),
      };
    case 'all':
    case 'any':
      return {
        [key]: readPredicateArray(predicateValue, `${scope}.${key}`),
      } as PredicateExpression;
    case 'not':
      return { not: readPredicate(predicateValue, `${scope}.not`) };
  }
  throw new Error(`${scope} uses an unsupported predicate`);
}

function readFileContains(
  value: unknown,
  scope: string,
): { globs: string[]; patterns: string[] } {
  const record = asRecord(value, scope);
  rejectUnknownKeys(record, FILE_CONTAINS_KEYS, scope);
  return {
    globs: readStringArray(record['globs'], `${scope}.globs`),
    patterns: readStringArray(record['patterns'], `${scope}.patterns`),
  };
}

function readPredicateArray(
  value: unknown,
  scope: string,
): PredicateExpression[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${scope} must be a non-empty array`);
  }
  return value.map((entry, index) =>
    readPredicate(entry, `${scope}[${index}]`),
  );
}

function readStringArray(value: unknown, scope: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${scope} must be a non-empty array`);
  }
  return value.map((entry, index) =>
    readNonEmptyString(entry, `${scope}[${index}]`),
  );
}

function readOptionalNonEmptyString(
  value: unknown,
  scope: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readNonEmptyString(value, scope);
}

function readNonEmptyString(value: unknown, scope: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${scope} must be a non-empty string`);
  }
  return value;
}

function readNonNegativeInteger(value: unknown, scope: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${scope} must be a non-negative integer`);
  }
  return value as number;
}

function asRecord(value: unknown, scope: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${scope} must be an object`);
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: Set<string>,
  scope: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`${scope} contains an unknown key: ${key}`);
    }
  }
}
