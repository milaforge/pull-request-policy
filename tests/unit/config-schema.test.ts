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

  it('accepts optional policy fields and nested predicate forms', () => {
    expect(
      validateConfig({
        policies: {
          release: {
            description: 'Release checks',
            severity: 'warn',
            require: {
              all: [
                { any: [{ title: ['release'] }, { body: ['notes'] }] },
                {
                  not: { file_contains: { globs: '*.md', patterns: 'draft' } },
                },
              ],
            },
          },
        },
      }).policies[0],
    ).toMatchObject({
      id: 'release',
      description: 'Release checks',
      severity: 'warn',
      require: {
        all: [
          { any: [{ title: ['release'] }, { body: ['notes'] }] },
          { not: { file_contains: { globs: ['*.md'], patterns: ['draft'] } } },
        ],
      },
    });
  });

  it('rejects malformed policy structures with actionable scopes', () => {
    const invalidConfigs: unknown[] = [
      {},
      { policies: { auth: {} } },
      { policies: { auth: { require: {} } } },
      { policies: { auth: { require: { all: [] } } } },
      { policies: { auth: { require: { not: {} } } } },
      { policies: { auth: { require: { file_contains: {} } } } },
      { policies: { auth: { require: { changed: [1] } } } },
      { policies: { auth: { require: { changed: '' } } } },
      { policies: { auth: { severity: 'invalid', require: { title: 'x' } } } },
      { policies: { auth: { description: 1, require: { title: 'x' } } } },
      { policies: { auth: { require: { unknown: true } } } },
      {
        policies: {
          auth: { require: { file_contains: { globs: [], patterns: 'x' } } },
        },
      },
      {
        policies: {
          auth: { require: { file_contains: { globs: 'x', patterns: [] } } },
        },
      },
    ];

    for (const config of invalidConfigs) {
      expect(() => validateConfig(config)).toThrow();
    }
  });

  it('rejects unknown keys and invalid top-level values', () => {
    expect(() => validateConfig({ extra: true, policies: {} })).toThrow(
      /unknown key/,
    );
    expect(() => validateConfig({ policies: null })).toThrow(/object/);
    expect(() =>
      validateConfig({ policies: { '': { require: { title: 'x' } } } }),
    ).toThrow(/policy id/);
  });
});
