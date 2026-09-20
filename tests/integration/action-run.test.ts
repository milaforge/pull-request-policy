import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runAction } from '../../src/action/main';
import type { ActionReporter } from '../../src/action/reporter';
import { createFacts } from '../helpers/facts';

describe('runAction', () => {
  it('fails with onboarding instructions when config is missing', async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), 'pull-request-policy-action-'),
    );
    const failures: string[] = [];

    await expect(
      runAction({
        inputs: { failOnWarn: false, mode: 'enforce' },
        cwd: workspace,
        reporter: createReporter({ failures }),
        factsProvider: () => Promise.resolve(createFacts()),
      }),
    ).rejects.toThrow(/No policy configuration found/i);

    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('fails the run when an error severity policy is violated', async () => {
    const workspace = await createWorkspaceWithConfig(`
policies:
  queue-change-requires-tests:
    when:
      changed:
        - "runtime/queue/**"
    require:
      changed:
        - "tests/**"
`);
    const failures: string[] = [];

    const result = await runAction({
      inputs: {
        configPath: path.join(workspace, '.github/pull-request-policy.yml'),
        failOnWarn: false,
        mode: 'enforce',
      },
      reporter: createReporter({ failures }),
      factsProvider: () => Promise.resolve(createFacts()),
    });

    expect(result.errorViolations).toBe(1);
    expect(failures[0]).toMatch(
      /queue-change-requires-tests.*requirement was not met/i,
    );
  });

  it('does not fail for warnings unless fail-on-warn is enabled', async () => {
    const workspace = await createWorkspaceWithConfig(`
policies:
  api-change-needs-changelog:
    severity: warn
    when:
      changed:
        - "api/public/**"
    require:
      changed:
        - "docs/release-notes/**"
`);
    const failures: string[] = [];
    const warnings: string[] = [];

    const result = await runAction({
      inputs: {
        configPath: path.join(workspace, '.github/pull-request-policy.yml'),
        failOnWarn: false,
        mode: 'enforce',
      },
      reporter: createReporter({ failures, warnings }),
      factsProvider: () => Promise.resolve(createFacts()),
    });

    expect(result.warningViolations).toBe(1);
    expect(failures).toEqual([]);
    expect(warnings[0]).toMatch(
      /api-change-needs-changelog.*requirement was not met/i,
    );
  });

  it('reports error violations without failing in audit mode', async () => {
    const workspace = await createWorkspaceWithConfig(`
policies:
  required-tests:
    require:
      changed: tests/**
`);
    const failures: string[] = [];

    const result = await runAction({
      inputs: {
        configPath: path.join(workspace, '.github/pull-request-policy.yml'),
        failOnWarn: true,
        mode: 'audit',
      },
      reporter: createReporter({ failures }),
      factsProvider: () => Promise.resolve(createFacts()),
    });

    expect(result.errorViolations).toBe(1);
    expect(failures).toEqual([]);
  });
});

function createReporter(sink: {
  notices?: string[];
  warnings?: string[];
  errors?: string[];
  failures?: string[];
}): ActionReporter {
  return {
    info: () => undefined,
    notice: (message) => sink.notices?.push(message),
    warning: (message) => sink.warnings?.push(message),
    error: (message) => sink.errors?.push(message),
    fail: (message) => sink.failures?.push(message),
    annotate: () => undefined,
    writeSummary: () => Promise.resolve(),
  };
}

async function createWorkspaceWithConfig(
  configSource: string,
): Promise<string> {
  const workspace = await fs.mkdtemp(
    path.join(os.tmpdir(), 'pull-request-policy-config-'),
  );
  const configDir = path.join(workspace, '.github');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(
    path.join(configDir, 'pull-request-policy.yml'),
    configSource.trimStart(),
    'utf8',
  );
  return workspace;
}
