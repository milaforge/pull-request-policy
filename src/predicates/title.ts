import type { PredicateOutcome } from '../engine/results';
import type { PolicyFacts } from '../facts/github-context';
import { findMatchingPatterns } from '../utils/patterns';

export function evaluateTitle(
  facts: PolicyFacts,
  patterns: string[],
): PredicateOutcome {
  const evidence = findMatchingPatterns(facts.prTitle, patterns);
  return evidence.length > 0
    ? { passed: true, evidence }
    : {
        passed: false,
        evidence: [
          `Current title: ${JSON.stringify(facts.prTitle)}. Expected it to match one of: ${patterns.map((pattern) => JSON.stringify(pattern)).join(', ')}.`,
        ],
      };
}
