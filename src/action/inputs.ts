import * as core from '@actions/core';

export interface ActionInputs {
  policy?: string;
  configPath?: string;
  githubToken?: string;
  mode: 'audit' | 'enforce';
}

export interface InputReader {
  getInput(
    name: string,
    options?: { required?: boolean; trimWhitespace?: boolean },
  ): string;
}

export function readInputs(reader: InputReader = core): ActionInputs {
  const configPath = normalize(reader.getInput('config-path'));
  const policy = normalize(reader.getInput('policy'));
  const githubToken = normalize(reader.getInput('github-token'));
  const inputs: ActionInputs = {
    mode: readModeInput(reader.getInput('mode')),
  };
  if (configPath !== undefined) {
    inputs.configPath = configPath;
  }
  if (policy !== undefined) {
    inputs.policy = policy;
  }
  if (githubToken !== undefined) {
    inputs.githubToken = githubToken;
  }
  return inputs;
}

function normalize(value: string): string | undefined {
  return value.trim().length === 0 ? undefined : value.trim();
}

function readModeInput(value: string): 'audit' | 'enforce' {
  const mode = value.trim().toLowerCase();
  if (mode === '' || mode === 'enforce') return 'enforce';
  if (mode === 'audit') return 'audit';
  throw new Error(
    `Invalid mode input: expected audit or enforce, received "${value}".`,
  );
}
