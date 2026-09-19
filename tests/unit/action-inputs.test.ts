import { describe, expect, it } from 'vitest';

import { readInputs } from '../../src/action/inputs';

describe('readInputs', () => {
  it('reads and normalizes optional inputs', () => {
    const inputs = readInputs({
      getInput(name) {
        const values: Record<string, string> = {
          'config-path': ' .github/custom.yml ',
          'github-token': ' secret ',
          'fail-on-warn': 'true',
          mode: 'audit',
        };
        return values[name] ?? '';
      },
    });

    expect(inputs).toEqual({
      configPath: '.github/custom.yml',
      githubToken: 'secret',
      failOnWarn: true,
      mode: 'audit',
    });
  });

  it('treats blank optional inputs as undefined', () => {
    const inputs = readInputs({
      getInput(name) {
        const values: Record<string, string> = {
          'config-path': ' ',
          'github-token': '',
          'fail-on-warn': 'false',
        };
        return values[name] ?? '';
      },
    });

    expect(inputs).toEqual({ failOnWarn: false, mode: 'enforce' });
  });

  it('rejects an unknown mode', () => {
    expect(() => readInputs({ getInput: () => 'unknown' })).toThrow(/mode/i);
  });
});
