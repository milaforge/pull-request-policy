import { describe, expect, it } from 'vitest';

import { validateConfig } from '../../src/config/validate-config';

describe('validateConfig', () => {
  it('normalizes the compact map syntax', () => {
    expect(
      validateConfig({
        policies: {
          auth: { when: { changed: 'src/auth/**' }, approvals: 2 },
          security: { require: { label: 'security-review' } },
        },
      }),
    ).toEqual({
      policies: [
        {
          id: 'auth',
          severity: 'error',
          when: { changed: ['src/auth/**'] },
          require: { approval_count_at_least: 2 },
          message: 'Policy "auth" requires at least 2 trusted approvals.',
        },
        {
          id: 'security',
          severity: 'error',
          require: { has_label: ['security-review'] },
          message: 'Policy "security" requirement was not met.',
        },
      ],
    });
  });

  it('combines compact predicates with all', () => {
    expect(
      validateConfig({
        policies: {
          release: { require: { changed: 'CHANGELOG.md', label: 'release' } },
        },
      }).policies[0]?.require,
    ).toEqual({
      all: [{ changed: ['CHANGELOG.md'] }, { has_label: ['release'] }],
    });
  });

  it('rejects legacy arrays and policy fields', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'legacy',
            severity: 'error',
            require: { changed: ['src/**'] },
            message: 'legacy',
          },
        ],
      }),
    ).toThrow(/object|policies/);
    expect(() =>
      validateConfig({
        policies: { auth: { require: { approval_count_at_least: 2 } } },
      }),
    ).toThrow(/unknown predicate/);
    expect(() =>
      validateConfig({
        policies: {
          auth: { require: { changed: 'src/**' }, message: 'custom' },
        },
      }),
    ).toThrow(/unknown key/);
  });

  it('rejects invalid compact values and shapes', () => {
    expect(() =>
      validateConfig({ policies: { auth: { approvals: -1 } } }),
    ).toThrow(/non-negative integer/);
    expect(() =>
      validateConfig({ policies: { auth: { require: { changed: [] } } } }),
    ).toThrow(/non-empty array/);
  });
});
