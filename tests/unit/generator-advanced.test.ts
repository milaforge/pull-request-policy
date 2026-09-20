import { describe, expect, it } from 'vitest';

import {
  addChildExpressionAtPath,
  moveExpressionAtPath,
  normalizeExpressionDraft,
  wrapExpressionAtPath,
} from '../../src/generator/expressions';
import {
  normalizeAdvancedPolicies,
  generatePolicyYaml,
} from '../../src/generator/policies';
import type { PolicyDraft } from '../../src/generator/types';

describe('advanced generator', () => {
  it('normalizes a single advanced predicate policy', () => {
    const draft: PolicyDraft = {
      uid: 'policy-1',
      id: 'custom-policy',
      description: 'Require docs labels',
      severity: 'warn',
      message: 'Needs docs label.',
      require: {
        kind: 'predicate',
        predicate: 'has_label',
        labels: ['docs'],
      },
    };

    const result = normalizeAdvancedPolicies([draft]);

    expect(result.errors).toEqual([]);
    expect(result.policies?.[0]).toEqual({
      id: 'custom-policy',
      description: 'Require docs labels',
      severity: 'warn',
      require: {
        has_label: ['docs'],
      },
      message: 'Needs docs label.',
    });
  });

  it('serializes nested combinators deterministically', () => {
    const draft: PolicyDraft = {
      uid: 'policy-1',
      id: 'nested-policy',
      description: '',
      severity: 'error',
      message: 'Sensitive changes need review or exception.',
      when: {
        kind: 'predicate',
        predicate: 'changed',
        globs: ['infra/**'],
      },
      require: {
        kind: 'combinator',
        operator: 'any',
        children: [
          {
            kind: 'predicate',
            predicate: 'approval_count_at_least',
            approvals: 2,
          },
          {
            kind: 'combinator',
            operator: 'all',
            children: [
              {
                kind: 'predicate',
                predicate: 'approval_count_at_least',
                approvals: 1,
              },
              {
                kind: 'combinator',
                operator: 'not',
                child: {
                  kind: 'predicate',
                  predicate: 'has_label',
                  labels: ['policy-exempt'],
                },
              },
            ],
          },
        ],
      },
    };

    const result = normalizeAdvancedPolicies([draft]);

    expect(result.errors).toEqual([]);
    const yaml = generatePolicyYaml(result.policies ?? []);
    expect(yaml).toContain('nested-policy:');
    expect(yaml).toContain('approvals: 2');
    expect(yaml).toContain('label:');
    expect(yaml).not.toContain('approval_count_at_least');
    expect(yaml).not.toContain('has_label');
  });

  it('rejects invalid not groups and empty groups', () => {
    const invalidNot = normalizeExpressionDraft(
      {
        kind: 'combinator',
        operator: 'not',
      },
      'require',
    );
    const invalidAny = normalizeExpressionDraft(
      {
        kind: 'combinator',
        operator: 'any',
        children: [],
      },
      'require',
    );
    const invalidApprovals = normalizeExpressionDraft(
      {
        kind: 'predicate',
        predicate: 'approval_count_at_least',
        approvals: '',
      },
      'require',
    );

    expect(invalidNot.errors[0]?.message).toContain('exactly one child');
    expect(invalidAny.errors[0]?.message).toContain('at least one child');
    expect(invalidApprovals.errors[0]?.message).toContain(
      'non-negative integer',
    );
  });

  it('preserves child ordering when wrapping and moving expressions', () => {
    const root = wrapExpressionAtPath(
      {
        kind: 'predicate',
        predicate: 'changed',
        globs: ['src/**'],
      },
      [],
      'all',
    );
    const withChild = addChildExpressionAtPath(root, [], {
      kind: 'predicate',
      predicate: 'changed',
      globs: ['tests/**'],
    });
    const reordered = moveExpressionAtPath(withChild, [1], 'up');

    expect(reordered).toEqual({
      kind: 'combinator',
      operator: 'all',
      children: [
        {
          kind: 'predicate',
          predicate: 'changed',
          globs: ['tests/**'],
        },
        {
          kind: 'predicate',
          predicate: 'changed',
          globs: ['src/**'],
        },
      ],
    });
  });
});
