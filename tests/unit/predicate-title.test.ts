import { describe, expect, it } from 'vitest';

import { evaluateTitle } from '../../src/predicates/title';
import { createFacts } from '../helpers/facts';

describe('evaluateTitle', () => {
  it('passes when the PR title matches one pattern', () => {
    const result = evaluateTitle(createFacts(), ['rollback', 'docs']);

    expect(result.passed).toBe(true);
    expect(result.evidence[0]).toMatch(/rollback/i);
  });

  it('fails when no pattern matches', () => {
    const result = evaluateTitle(
      createFacts({ prTitle: 'test(test):\u00a0test' }),
      ['^test\\([^)]+\\): .+'],
    );

    expect(result.passed).toBe(false);
    expect(result.evidence[0]).toContain('Current title: "test(test): test"');
    expect(result.evidence[0]).toContain('Expected it to match one of:');
  });
});
