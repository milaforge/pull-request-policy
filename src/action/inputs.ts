import * as core from '@actions/core';

export interface ActionInputs {
  configPath?: string;
  githubToken?: string;
  failOnWarn: boolean;
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
  const githubToken = normalize(reader.getInput('github-token'));
  const inputs: ActionInputs = {
    failOnWarn: readBooleanInput(reader.getInput('fail-on-warn')),
    mode: readModeInput(reader.getInput('mode')),
  };
  if (configPath !== undefined) {
    inputs.configPath = configPath;
  }
  if (githubToken !== undefined) {
    inputs.githubToken = githubToken;
  }
  return inputs;
}

function normalize(value: string): string | undefined {
  return value.trim().length === 0 ? undefined : value.trim();
}

function readBooleanInput(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

function readModeInput(value: string): 'audit' | 'enforce' {
  const mode = value.trim().toLowerCase();
  if (mode === '' || mode === 'enforce') return 'enforce';
  if (mode === 'audit') return 'audit';
  throw new Error(
    `Invalid mode input: expected audit or enforce, received "${value}".`,
  );
}
