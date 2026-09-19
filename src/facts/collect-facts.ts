import * as github from '@actions/github';
import type { PolicyConfig } from '../config/schema';
import { countApprovals } from './approvals';
import { listChangedFiles } from './changed-files';
import {
  type GitHubClient,
  type PolicyFacts,
  requirePullRequestContext,
} from './github-context';
import {
  collectRepoRequirements,
  readGitHubRepoFiles,
} from './github-repo-files';

export async function collectPolicyFacts(
  client: GitHubClient,
  config: PolicyConfig,
): Promise<PolicyFacts> {
  const pullRequest = requirePullRequestContext(github.context);
  const changedFiles = await listChangedFiles(client, pullRequest);
  const requirements = collectRepoRequirements(config);
  const { repoFiles, fileContents } = await readGitHubRepoFiles(
    client,
    pullRequest,
    requirements,
  );
  return {
    changedFiles: changedFiles.all,
    addedFiles: changedFiles.added,
    removedFiles: changedFiles.removed,
    renamedFiles: changedFiles.renamed,
    prTitle: pullRequest.title,
    prBody: pullRequest.body,
    labels: pullRequest.labels,
    requestedReviewers: pullRequest.requestedReviewers,
    approvalsCount: await countApprovals(client, pullRequest),
    repoFiles,
    fileContents,
  };
}
