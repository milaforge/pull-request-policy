import { describe, expect, it } from 'vitest';

import { validateConfig } from '../../src/config/validate-config';

describe('validateConfig', () => {
  it('normalizes compact policies into the canonical policy representation', () => {
    const config = validateConfig({
      policies: {
        auth: {
          when: { changed: 'src/auth/**' },
          approvals: 2,
        },
      },
    });

    expect(config).toEqual({
      policies: [
        {
          id: 'auth',
          severity: 'error',
          when: { changed: ['src/auth/**'] },
          require: { approval_count_at_least: 2 },
          message: 'Policy "auth" requires at least 2 trusted approvals.',
        },
      ],
    });
  });

  it('accepts a valid config', () => {
    const config = validateConfig({
      policies: [
        {
          id: 'queue-change-requires-tests',
          description: 'Queue changes must include tests or failure-mode docs.',
          severity: 'error',
          when: {
            changed: ['runtime/queue/**', 'runtime/store/**'],
          },
          require: {
            any: [{ changed: ['tests/**'] }, { changed: ['failure_modes/**'] }],
          },
          message: 'Queue/store changes require tests or failure-mode updates.',
        },
      ],
    });

    expect(config.policies).toHaveLength(1);
    expect(config.policies[0]?.id).toBe('queue-change-requires-tests');
  });

  it('accepts combinators, approval counts, and file content predicates', () => {
    const config = validateConfig({
      policies: [
        {
          id: 'auth-change-needs-review',
          description: 'Auth changes need labels or approvals.',
          severity: 'warn',
          when: {
            all: [
              { changed: ['src/auth/**'] },
              { not: { has_label: ['skip-policy'] } },
            ],
          },
          require: {
            any: [
              { approval_count_at_least: 2 },
              {
                file_contains: {
                  globs: ['docs/**/*.md'],
                  patterns: ['security review'],
                },
              },
            ],
          },
          message: 'Auth changes need review evidence.',
        },
      ],
    });

    expect(config.policies[0]?.when).toBeDefined();
  });

  it('accepts body and title predicates', () => {
    const config = validateConfig({
      policies: [
        {
          id: 'text-check',
          severity: 'warn',
          require: {
            any: [{ body: ['rollback'] }, { title: ['^fix:'] }],
          },
          message: 'Text check failed.',
        },
      ],
    });

    expect(config.policies).toHaveLength(1);
  });

  it('rejects invalid severity values', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'bad-severity',
            severity: 'fatal',
            require: { changed: ['src/**'] },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/severity/i);
  });

  it('rejects empty ids', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: '',
            severity: 'error',
            require: { changed: ['src/**'] },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/id/i);
  });

  it('rejects missing messages', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'missing-message',
            severity: 'warn',
            require: { changed: ['src/**'] },
          },
        ],
      }),
    ).toThrow(/message/i);
  });

  it('rejects unknown top-level keys', () => {
    expect(() =>
      validateConfig({
        policies: [],
        nope: true,
      }),
    ).toThrow(/unrecognized|unknown/i);
  });

  it('rejects invalid predicate shapes', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'bad-predicate',
            severity: 'error',
            require: {
              changed: [],
              exists: ['README.md'],
            },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/predicate|require/i);
  });

  it('rejects non-object configs', () => {
    expect(() => validateConfig([])).toThrow(/config must be an object/i);
  });

  it('rejects negative approval counts', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'bad-approvals',
            severity: 'error',
            require: { approval_count_at_least: -1 },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/non-negative integer/i);
  });

  it('rejects invalid file_contains shapes', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'bad-file-contains',
            severity: 'error',
            require: {
              file_contains: {
                globs: [],
                patterns: ['rollback'],
                extra: true,
              },
            },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/unknown key|non-empty array/i);
  });

  it('rejects empty combinator arrays', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'bad-any',
            severity: 'error',
            require: { any: [] },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/non-empty array/i);
  });

  it('rejects unknown predicate keys', () => {
    expect(() =>
      validateConfig({
        policies: [
          {
            id: 'bad-key',
            severity: 'error',
            require: { nope: ['x'] },
            message: 'broken',
          },
        ],
      }),
    ).toThrow(/unknown predicate/i);
  });
});
