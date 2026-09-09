import type { GitHubClient, PullRequestContext } from './github-context';

const TRUSTED_APPROVAL_PERMISSIONS = new Set(['write', 'admin']);

export async function countApprovals(
  client: GitHubClient,
  pullRequest: PullRequestContext,
): Promise<number> {
  const reviews = (await client.paginate(client.rest.pulls.listReviews, {
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    pull_number: pullRequest.number,
    per_page: 100,
  })) as Array<{ state: string; user?: { login?: string } }>;
  const states = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login;
    if (login === undefined) {
      continue;
    }
    states.set(login, review.state);
  }

  const approvedReviewers = [...states.entries()]
    .filter(([, state]) => state === 'APPROVED')
    .map(([login]) => login)
    .sort();
  let approvals = 0;

  for (const username of approvedReviewers) {
    const permission = await getReviewerPermission(
      client,
      pullRequest,
      username,
    );
    if (TRUSTED_APPROVAL_PERMISSIONS.has(permission)) {
      approvals += 1;
    }
  }

  return approvals;
}

async function getReviewerPermission(
  client: GitHubClient,
  pullRequest: PullRequestContext,
  username: string,
): Promise<string> {
  try {
    const response = await client.rest.repos.getCollaboratorPermissionLevel({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      username,
    });
    const permission: unknown = response.data.permission;
    if (typeof permission !== 'string') {
      throw new Error('GitHub returned an invalid repository permission.');
    }
    return permission;
  } catch (error) {
    if (isNotCollaboratorError(error)) {
      return 'none';
    }
    throw new Error(
      `Unable to verify repository permission for approved reviewer ${username}. Refusing to count the approval.`,
    );
  }
}

function isNotCollaboratorError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 404
  );
}
