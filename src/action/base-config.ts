import { Buffer } from 'node:buffer';
import path from 'node:path';

import {
  createMissingConfigError,
  loadConfigFromSource,
  type LoadedConfig,
} from '../config/load-config';
import type { PullRequestContext, GitHubClient } from '../facts/github-context';

export async function loadConfigFromBase(
  client: GitHubClient,
  pullRequest: PullRequestContext,
  configPath: string,
): Promise<LoadedConfig> {
  const repositoryPath = validateRepositoryPath(configPath);

  try {
    const response = await client.rest.repos.getContent({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      path: repositoryPath,
      ref: pullRequest.baseSha,
    });
    const content = response.data;
    if (!isBase64File(content)) {
      throw new Error(
        `Policy config at ${repositoryPath} is not a base64 file.`,
      );
    }

    const encodedContent = content.content;
    return loadConfigFromSource(
      Buffer.from(encodedContent, 'base64').toString('utf8'),
      `${pullRequest.baseSha}:${repositoryPath}`,
    );
  } catch (error) {
    if (getStatus(error) !== 404) {
      throw error;
    }
    throw createMissingConfigError(configPath);
  }
}

function validateRepositoryPath(configPath: string): string {
  const normalized = configPath.replaceAll('\\', '/');
  if (
    normalized.length === 0 ||
    path.posix.isAbsolute(normalized) ||
    normalized.split('/').some((segment) => segment === '..')
  ) {
    throw new Error(
      'config-path must be a non-empty repository-relative path.',
    );
  }
  return normalized;
}

function getStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
}

function isBase64File(
  content: unknown,
): content is { type: 'file'; encoding: 'base64'; content: string } {
  if (
    typeof content !== 'object' ||
    content === null ||
    Array.isArray(content)
  ) {
    return false;
  }
  const candidate = content as Record<string, unknown>;
  return (
    candidate['type'] === 'file' &&
    candidate['encoding'] === 'base64' &&
    typeof candidate['content'] === 'string'
  );
}
