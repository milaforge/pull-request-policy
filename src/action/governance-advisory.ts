import type { GitHubClient, PullRequestContext } from '../facts/github-context';

const CODEOWNERS_PATHS = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS',
];

export async function collectGovernanceNotices(
  client: GitHubClient,
  pullRequest: PullRequestContext,
): Promise<string[]> {
  const notices: string[] = [];
  const codeowners = await findCodeowners(client, pullRequest);
  const protection = await readBranchProtection(client, pullRequest);

  if (codeowners === 'missing') {
    notices.push(
      'Governance advisory: No CODEOWNERS file was found at the trusted base SHA. Add one that protects .github/workflows/**, .github/pull-request-policy.yml, and .github/CODEOWNERS.',
    );
  } else if (codeowners === 'unverified') {
    notices.push(
      'Governance advisory: Unable to verify whether CODEOWNERS exists at the trusted base SHA. Check repository access and protect the policy paths manually.',
    );
  }

  if (protection === 'unverified') {
    notices.push(
      `Governance advisory: Unable to verify branch protection for ${pullRequest.baseRef}. Configure required status checks and required code-owner review for this branch.`,
    );
  } else {
    if (!protection.hasRequiredStatusChecks) {
      notices.push(
        `Governance advisory: Branch ${pullRequest.baseRef} has no required status checks. Require this policy job before merging.`,
      );
    }
    if (!protection.requiresCodeOwnerReview) {
      notices.push(
        `Governance advisory: Branch ${pullRequest.baseRef} does not require code-owner review. Enable it after CODEOWNERS protects the policy paths.`,
      );
    }
  }

  return notices;
}

async function findCodeowners(
  client: GitHubClient,
  pullRequest: PullRequestContext,
): Promise<'present' | 'missing' | 'unverified'> {
  for (const filePath of CODEOWNERS_PATHS) {
    try {
      await client.rest.repos.getContent({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        path: filePath,
        ref: pullRequest.baseSha,
      });
      return 'present';
    } catch (error) {
      if (getStatus(error) !== 404) {
        return 'unverified';
      }
    }
  }
  return 'missing';
}

async function readBranchProtection(
  client: GitHubClient,
  pullRequest: PullRequestContext,
): Promise<
  | {
      hasRequiredStatusChecks: boolean;
      requiresCodeOwnerReview: boolean;
    }
  | 'unverified'
> {
  const rules = await readBranchRules(client, pullRequest);
  const protection = await readClassicBranchProtection(client, pullRequest);
  if (rules !== 'unverified' || protection !== 'unverified') {
    return {
      hasRequiredStatusChecks:
        rules !== 'unverified' && rules.hasRequiredStatusChecks
          ? true
          : protection !== 'unverified' && protection.hasRequiredStatusChecks,
      requiresCodeOwnerReview:
        rules !== 'unverified' && rules.requiresCodeOwnerReview
          ? true
          : protection !== 'unverified' && protection.requiresCodeOwnerReview,
    };
  }
  return 'unverified';
}

async function readBranchRules(
  client: GitHubClient,
  pullRequest: PullRequestContext,
): Promise<
  | {
      hasRequiredStatusChecks: boolean;
      requiresCodeOwnerReview: boolean;
    }
  | 'unverified'
> {
  try {
    const response = await client.rest.repos.getBranchRules({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      branch: pullRequest.baseRef,
    });
    return readRulesetSettings(response.data);
  } catch {
    return 'unverified';
  }
}

async function readClassicBranchProtection(
  client: GitHubClient,
  pullRequest: PullRequestContext,
): Promise<
  | {
      hasRequiredStatusChecks: boolean;
      requiresCodeOwnerReview: boolean;
    }
  | 'unverified'
> {
  try {
    const response = await client.rest.repos.getBranchProtection({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      branch: pullRequest.baseRef,
    });
    return readProtectionSettings(response.data);
  } catch {
    return 'unverified';
  }
}

function readRulesetSettings(data: unknown): {
  hasRequiredStatusChecks: boolean;
  requiresCodeOwnerReview: boolean;
} {
  if (!Array.isArray(data)) {
    return {
      hasRequiredStatusChecks: false,
      requiresCodeOwnerReview: false,
    };
  }
  return {
    hasRequiredStatusChecks: data.some(hasRequiredStatusCheckRule),
    requiresCodeOwnerReview: data.some(hasCodeOwnerReviewRule),
  };
}

function hasRequiredStatusCheckRule(value: unknown): boolean {
  return (
    getRuleType(value) === 'required_status_checks' &&
    hasEntries(getRuleParameters(value)?.['required_status_checks'])
  );
}

function hasCodeOwnerReviewRule(value: unknown): boolean {
  return (
    getRuleType(value) === 'pull_request' &&
    getRuleParameters(value)?.['require_code_owner_review'] === true
  );
}

function getRuleType(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const type = (value as Record<string, unknown>)['type'];
  return typeof type === 'string' ? type : undefined;
}

function getRuleParameters(
  value: unknown,
): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const parameters = (value as Record<string, unknown>)['parameters'];
  return typeof parameters === 'object' && parameters !== null
    ? (parameters as Record<string, unknown>)
    : undefined;
}

function readProtectionSettings(data: unknown): {
  hasRequiredStatusChecks: boolean;
  requiresCodeOwnerReview: boolean;
} {
  if (typeof data !== 'object' || data === null) {
    return {
      hasRequiredStatusChecks: false,
      requiresCodeOwnerReview: false,
    };
  }
  const protection = data as Record<string, unknown>;
  const statusChecks = protection['required_status_checks'];
  const reviews = protection['required_pull_request_reviews'];
  return {
    hasRequiredStatusChecks: hasRequiredStatusChecks(statusChecks),
    requiresCodeOwnerReview: hasRequiredCodeOwnerReview(reviews),
  };
}

function hasRequiredStatusChecks(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const statusChecks = value as Record<string, unknown>;
  return (
    hasEntries(statusChecks['contexts']) || hasEntries(statusChecks['checks'])
  );
}

function hasRequiredCodeOwnerReview(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    (value as Record<string, unknown>)['require_code_owner_reviews'] === true
  );
}

function hasEntries(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function getStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
}
