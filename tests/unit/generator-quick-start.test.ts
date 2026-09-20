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

    expect(yaml).toBe(`name: PR Policy
on:
  pull_request:
    types: [opened, synchronize, reopened, edited]
jobs:
  policy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: milaforge/pull-request-policy@025b7c153194f0712f91809bfada9fce35057c46 # v0.1-beta
        with:
          mode: audit
`);
  });

  it('renders only the repository-independent starter policy by default', () => {
    const output = generateOutput(createDefaultGeneratorState());

    expect(output.errors).toEqual([]);
    expect(output.policyYaml).not.toContain('id: title-format');
    expect(output.policyConfig?.policies.map((policy) => policy.id)).toEqual([
      'pr-body-required',
    ]);
  });

  it('builds compact map yaml for each quick start preset', () => {
    const state = createDefaultQuickStartState();
    for (const preset of Object.values(state.presets)) preset.enabled = true;
    state.presets['sensitive-paths'].globs = [
      '.github/workflows/**',
      'infra/**',
    ];
    const policyMap = buildQuickStartPolicyMap(state);

    const yaml = generatePolicyYaml(Object.values(policyMap).filter(Boolean));
    expect(yaml).toContain('title-format:');
    expect(yaml).toContain('sensitive-paths:');
    expect(yaml).toContain('approvals: 2');
    expect(yaml).not.toContain('- id:');
    expect(yaml).not.toContain('message:');
  });

  it('uses safe default as a macro over the core presets', () => {
    const withoutCore = setSafeDefaultEnabled(
      createDefaultQuickStartState(),
      false,
    );

    expect(withoutCore.presets['safe-default'].enabled).toBe(false);
    expect(
      buildQuickStartPolicies(withoutCore).map((policy) => policy.id),
    ).toEqual([]);

    const withCore = setSafeDefaultEnabled(withoutCore, true);

    expect(withCore.presets['safe-default'].enabled).toBe(true);
    expect(
      buildQuickStartPolicies(withCore).map((policy) => policy.id),
    ).toEqual([
      'title-format',
      'pr-body-required',
      'tests-for-source-changes',
      'release-safety',
    ]);
  });
});
