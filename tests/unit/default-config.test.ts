import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG_PATH } from '../../src/config/default-config';
import { loadConfig } from '../../src/config/load-config';

describe('loadConfig', () => {
  const originalCwd = process.cwd();
  const originalRunnerTemp = process.env['RUNNER_TEMP'];

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalRunnerTemp === undefined) {
      delete process.env['RUNNER_TEMP'];
    } else {
      process.env['RUNNER_TEMP'] = originalRunnerTemp;
    }
  });

  it('fails with onboarding instructions when config is missing', async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), 'pull-request-policy-workspace-'),
    );
    process.chdir(workspace);
    await expect(loadConfig()).rejects.toThrow(
      new RegExp(`No policy configuration found at ${DEFAULT_CONFIG_PATH}`),
    );
  });
});
