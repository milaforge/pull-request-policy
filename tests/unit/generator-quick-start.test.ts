import { describe, expect, it } from 'vitest';

import {
  createDefaultGeneratorState,
  createDefaultQuickStartState,
  setSafeDefaultEnabled,
} from '../../src/generator/presets';
import {
  buildQuickStartPolicies,
  buildQuickStartPolicyMap,
  generateOutput,
  generatePolicyYaml,
} from '../../src/generator/policies';
import { generateWorkflowYaml } from '../../src/generator/workflow';

describe('quick start generator', () => {
  it('generates the default workflow yaml', () => {
    const yaml = generateWorkflowYaml(createDefaultGeneratorState().workflow);

    expect(yaml).toBe(`name: pull-request-policy
on: [pull_request]
jobs:
  check-policy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: milaforge/pull-request-policy@025b7c153194f0712f91809bfada9fce35057c46 # v0.1-beta
`);
  });

  it('renders sharp default quick start policies in stable order', () => {
    const output = generateOutput(createDefaultGeneratorState());

    expect(output.errors).toEqual([]);
    expect(output.policyYaml).toContain('id: title-format');
    expect(output.policyYaml).toContain('id: docs-runbook-evidence');
    expect(output.policyConfig?.policies.map((policy) => policy.id)).toEqual([
      'title-format',
      'pr-body-required',
      'tests-for-source-changes',
      'sensitive-paths',
      'release-safety',
      'docs-runbook-evidence',
    ]);
  });

  it('builds exact yaml for each quick start preset', () => {
    const policyMap = buildQuickStartPolicyMap(createDefaultQuickStartState());

    expect(generatePolicyYaml([policyMap['title-format']!])).toBe(`policies:
  - id: title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore|ci|security): .+'
    message: PR title must start with feat:, fix:, docs:, refactor:, test:, chore:, ci:, or security:.
`);

    expect(generatePolicyYaml([policyMap['pr-body-required']!])).toBe(`policies:
  - id: pr-body-required
    severity: error
    require:
      body:
        - \\S
    message: PR body is required.
`);

    expect(generatePolicyYaml([policyMap['tests-for-source-changes']!]))
      .toBe(`policies:
  - id: tests-for-source-changes
    severity: error
    require:
      changed:
        - test/**
        - tests/**
        - '**/*.test.*'
        - '**/*.spec.*'
    message: Source changes must include tests.
    when:
      changed:
        - src/**
        - app/**
        - lib/**
        - packages/**
`);

    expect(generatePolicyYaml([policyMap['sensitive-paths']!])).toBe(`policies:
  - id: sensitive-paths
    severity: error
    require:
      approval_count_at_least: 2
    message: Workflow, infra, auth, secrets, and deployment changes require at least 2 write-or-higher approvals.
    when:
      changed:
        - .github/**
        - .github/workflows/**
        - infra/**
        - auth/**
        - secrets/**
        - deploy/**
        - deployment/**
`);

    expect(generatePolicyYaml([policyMap['release-safety']!])).toBe(`policies:
  - id: release-safety
    severity: error
    require:
      all:
        - body:
            - rollout
        - body:
            - rollback
    message: Risky workflow and operational changes must mention rollout and rollback in the PR body.
    when:
      changed:
        - .github/workflows/**
        - infra/**
        - deploy/**
        - deployment/**
        - ops/**
`);

    expect(generatePolicyYaml([policyMap['docs-runbook-evidence']!]))
      .toBe(`policies:
  - id: docs-runbook-evidence
    severity: warn
    require:
      changed:
        - docs/**
        - runbooks/**
        - operations/**
    message: Operational changes should include docs, runbook, or operations updates.
    when:
      changed:
        - .github/workflows/**
        - infra/**
        - deploy/**
        - deployment/**
        - ops/**
`);
  });

  it('uses safe default as a macro over the core presets', () => {
    const withoutCore = setSafeDefaultEnabled(
      createDefaultQuickStartState(),
      false,
    );

    expect(withoutCore.presets['safe-default'].enabled).toBe(false);
    expect(
      buildQuickStartPolicies(withoutCore).map((policy) => policy.id),
    ).toEqual(['docs-runbook-evidence']);

    const withCore = setSafeDefaultEnabled(withoutCore, true);

    expect(withCore.presets['safe-default'].enabled).toBe(true);
    expect(
      buildQuickStartPolicies(withCore).map((policy) => policy.id),
    ).toEqual([
      'title-format',
      'pr-body-required',
      'tests-for-source-changes',
      'sensitive-paths',
      'release-safety',
      'docs-runbook-evidence',
    ]);
  });
});
