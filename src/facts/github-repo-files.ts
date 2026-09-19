import type { PolicyConfig, PredicateExpression } from '../config/schema';
import { findMatches } from '../utils/glob';
import type { GitHubClient, PullRequestContext } from './github-context';

export interface RepoRequirements {
  needsRepoFiles: boolean;
  fileContentGlobs: string[];
}

export async function readGitHubRepoFiles(
  client: GitHubClient,
  pullRequest: PullRequestContext,
  requirements: RepoRequirements,
): Promise<{ repoFiles: string[]; fileContents: Record<string, string> }> {
  if (!requirements.needsRepoFiles) return { repoFiles: [], fileContents: {} };
  const headSha = pullRequest.headSha;
  if (!headSha)
    throw new Error('Pull request head SHA is required for repository facts.');
  const tree = await client.rest.git.getTree({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    tree_sha: headSha,
    recursive: 'true',
  });
  const entries = tree.data.tree as Array<{ type?: string; path?: string }>;
  const repoFiles = entries
    .filter((entry) => entry.type === 'blob' && entry.path !== undefined)
    .map((entry) => entry.path as string)
    .sort();
  const filesToRead = findMatches(repoFiles, requirements.fileContentGlobs);
  const fileContents = Object.fromEntries(
    await Promise.all(
      filesToRead.map(async (file) => {
        const response = await client.rest.repos.getContent({
          owner: pullRequest.owner,
          repo: pullRequest.repo,
          path: file,
          ref: headSha,
        });
        const data = response.data;
        if (
          Array.isArray(data) ||
          data.type !== 'file' ||
          data.content === undefined
        ) {
          throw new Error(
            `Unable to read repository file "${file}" from the pull request head.`,
          );
        }
        const content = data.content as string;
        return [
          file,
          Buffer.from(
            content,
            data.encoding === 'base64' ? 'base64' : 'utf8',
          ).toString('utf8'),
        ] as const;
      }),
    ),
  );
  return { repoFiles, fileContents };
}

export function collectRepoRequirements(
  config: PolicyConfig,
): RepoRequirements {
  const fileContentGlobs = new Set<string>();
  let needsRepoFiles = false;
  for (const policy of config.policies) {
    visitPredicate(policy.when, fileContentGlobs, (value) => {
      needsRepoFiles ||= value;
    });
    visitPredicate(policy.require, fileContentGlobs, (value) => {
      needsRepoFiles ||= value;
    });
  }
  return { needsRepoFiles, fileContentGlobs: [...fileContentGlobs] };
}

function visitPredicate(
  predicate: PredicateExpression | undefined,
  globs: Set<string>,
  flag: (value: boolean) => void,
): void {
  if (predicate === undefined) return;
  if ('exists' in predicate) {
    flag(true);
    return;
  }
  if ('file_contains' in predicate) {
    flag(true);
    predicate.file_contains.globs.forEach((glob) => globs.add(glob));
    return;
  }
  if ('all' in predicate)
    predicate.all.forEach((entry) => visitPredicate(entry, globs, flag));
  else if ('any' in predicate)
    predicate.any.forEach((entry) => visitPredicate(entry, globs, flag));
  else if ('not' in predicate) visitPredicate(predicate.not, globs, flag);
}
import { Buffer } from 'node:buffer';
