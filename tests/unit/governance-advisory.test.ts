import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { collectGovernanceNotices } from '../../src/action/governance-advisory';

describe('collectGovernanceNotices', () => {
  it('warns when the trusted base has no CODEOWNERS or required branch safeguards', async () => {
    const getContent = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Not Found'), { status: 404 }),
      );
    const getBranchProtection = vi.fn().mockResolvedValue({
      data: {
        required_status_checks: null,
        required_pull_request_reviews: null,
      },
    });
    const getBranchRules = vi.fn().mockResolvedValue({ data: [] });

    const notices = await collectGovernanceNotices(
      {
        rest: { repos: { getContent, getBranchProtection, getBranchRules } },
      } as never,
      createPullRequest(),
    );

    expect(notices).toEqual([
      expect.stringMatching(/no CODEOWNERS file/i),
      expect.stringMatching(/required status checks/i),
      expect.stringMatching(/code-owner review/i),
    ]);
    expect(getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: '.github/CODEOWNERS', ref: 'base-sha' }),
    );
    expect(getBranchProtection).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'demo',
      branch: 'main',
    });
    expect(getBranchRules).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'demo',
      branch: 'main',
    });
  });

  it('does not warn when CODEOWNERS and branch safeguards are configured', async () => {
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from('/.github/ @security-team\n').toString('base64'),
      },
    });
    const getBranchProtection = vi.fn().mockResolvedValue({
      data: {
        required_status_checks: { contexts: ['policy / check'] },
        required_pull_request_reviews: { require_code_owner_reviews: true },
      },
    });
    const getBranchRules = vi.fn().mockResolvedValue({
      data: [
        {
          type: 'required_status_checks',
          parameters: {
            required_status_checks: [{ context: 'policy / check' }],
          },
        },
        {
          type: 'pull_request',
          parameters: { require_code_owner_review: true },
        },
      ],
    });

    await expect(
      collectGovernanceNotices(
        {
          rest: { repos: { getContent, getBranchProtection, getBranchRules } },
        } as never,
        createPullRequest(),
      ),
    ).resolves.toEqual([]);
  });

  it('warns when branch protection cannot be verified', async () => {
    const getContent = vi.fn().mockResolvedValue({ data: { type: 'file' } });
    const getBranchProtection = vi
      .fn()
      .mockRejectedValue(new Error('Resource not accessible by integration'));
    const getBranchRules = vi
      .fn()
      .mockRejectedValue(new Error('Resource not accessible by integration'));

    await expect(
      collectGovernanceNotices(
        {
          rest: { repos: { getContent, getBranchProtection, getBranchRules } },
        } as never,
        createPullRequest(),
      ),
    ).resolves.toEqual([
      expect.stringMatching(/unable to verify branch protection/i),
    ]);
  });
});

function createPullRequest() {
  return {
    owner: 'acme',
    repo: 'demo',
    number: 42,
    baseSha: 'base-sha',
    baseRef: 'main',
    title: 'Change authentication',
    body: '',
    labels: [],
    requestedReviewers: [],
  };
}
