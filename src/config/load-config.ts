import { promises as fs } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { DEFAULT_CONFIG_PATH } from './default-config';
import type { PolicyConfig } from './schema';
import { validateConfig } from './validate-config';

export interface LoadedConfig {
  config: PolicyConfig;
  advisoryOnly: boolean;
  generatedDefault: boolean;
  resolvedPath: string;
  notices: string[];
}

export interface LoadConfigOptions {
  cwd?: string | undefined;
  runnerTemp?: string | undefined;
}

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<LoadedConfig> {
  const resolvedPath = path.resolve(
    options.cwd ?? process.cwd(),
    DEFAULT_CONFIG_PATH,
  );
  try {
    await fs.access(resolvedPath);
    return loadConfigFromPath(resolvedPath);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw createMissingConfigError(DEFAULT_CONFIG_PATH);
    }
    throw error;
  }
}

export async function loadConfigFromPath(
  configPath: string,
): Promise<LoadedConfig> {
  const resolvedPath = path.resolve(configPath);
  const source = await fs.readFile(resolvedPath, 'utf8');
  return loadConfigFromSource(source, resolvedPath);
}

export function loadConfigFromSource(
  source: string,
  resolvedPath: string,
): LoadedConfig {
  const parsed = yaml.load(source);
  return {
    config: validateConfig(parsed),
    advisoryOnly: false,
    generatedDefault: false,
    resolvedPath,
    notices: [],
  };
}

export function createMissingConfigError(configPath: string): Error {
  return new Error(
    `No policy configuration found at ${configPath}. Copy .github/pull-request-policy.yml.example to ${DEFAULT_CONFIG_PATH}, customize it, and commit it before opening a pull request. See https://github.com/milaforge/pull-request-policy#quick-start.`,
  );
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
