import type {
  Policy,
  PolicyConfig,
  PredicateExpression,
  Severity,
} from './schema';

const TOP_LEVEL_KEYS = new Set(['policies']);
const MAP_POLICY_KEYS = new Set([
  'description',
  'severity',
  'when',
  'require',
  'approvals',
]);
const FILE_CONTAINS_KEYS = new Set(['globs', 'patterns']);
const PREDICATE_KEYS = [
  'changed',
  'exists',
  'body',
  'title',
  'label',
  'approvals',
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
  const record = asRecord(value, 'config.policies');
  return Object.entries(record).map(([id, policy], index) =>
    readMapPolicy(id, policy, `config.policies.${id || index}`),
  );
}

function readMapPolicy(id: string, value: unknown, scope: string): Policy {
  const record = asRecord(value, scope);
  rejectUnknownKeys(record, MAP_POLICY_KEYS, scope);
  const requireValue =
    record['require'] ??
    (record['approvals'] === undefined
      ? undefined
      : { approvals: record['approvals'] });
  if (requireValue === undefined) {
    throw new Error(`${scope}.require is required`);
  }
  const require = readMapPredicate(requireValue, `${scope}.require`);
  const when = readOptionalMapPredicate(record['when'], `${scope}.when`);
  const description = readOptionalNonEmptyString(
    record['description'],
    `${scope}.description`,
  );
  const severity =
    record['severity'] === undefined
      ? 'error'
      : readSeverity(record['severity'], `${scope}.severity`);
  const approvalCount = isApprovalMap(requireValue)
    ? readNonNegativeInteger(
        (requireValue as Record<string, unknown>)['approvals'],
        `${scope}.require.approvals`,
      )
    : undefined;
  const policy: Policy = {
    id: readNonEmptyString(id, `${scope} policy id`),
    severity,
    require,
    message:
      approvalCount !== undefined
        ? `Policy "${id}" requires at least ${approvalCount} trusted approval${approvalCount === 1 ? '' : 's'}.`
        : `Policy "${id}" requirement was not met.`,
  };
  if (when !== undefined) policy.when = when;
  if (description !== undefined) policy.description = description;
  return policy;
}

function readOptionalMapPredicate(
  value: unknown,
  scope: string,
): PredicateExpression | undefined {
  return value === undefined ? undefined : readMapPredicate(value, scope);
}

function readMapPredicate(value: unknown, scope: string): PredicateExpression {
  const record = asRecord(value, scope);
  const entries = Object.entries(record);
  if (entries.length === 0) throw new Error(`${scope} must not be empty`);
  const predicates = entries.map(([key, predicateValue]) =>
    readPredicate({ [key]: predicateValue }, scope),
  );
  return predicates.length === 1 ? predicates[0]! : { all: predicates };
}

function isApprovalMap(value: unknown): boolean {
  return (
    Object.keys(asRecord(value, 'require')).length === 1 &&
    Object.prototype.hasOwnProperty.call(value, 'approvals')
  );
}

function readSeverity(value: unknown, scope: string): Severity {
  if (value === 'error' || value === 'warn') {
    return value;
  }
  throw new Error(`${scope} must be "error" or "warn"`);
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
      return {
        [key]: readStringArray(predicateValue, `${scope}.${key}`),
      } as PredicateExpression;
    case 'label':
      return {
        has_label: readStringArray(predicateValue, `${scope}.${key}`),
      };
    case 'approvals':
      return {
        approval_count_at_least: readNonNegativeInteger(
          predicateValue,
          `${scope}.${key}`,
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
  if (typeof value === 'string') {
    return [readNonEmptyString(value, scope)];
  }
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
