import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { loadConfigFromBase } from '../../src/action/base-config';

describe('loadConfigFromBase', () => {
  it('loads the policy from the pull request base SHA, not the checked-out workspace', async () => {
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from(
          `policies:\n  - id: auth-needs-review\n    severity: error\n    when:\n      changed: ['src/auth/**']\n    require:\n      approval_count_at_least: 2\n    message: Auth changes require two approvals.\n`,
        ).toString('base64'),
      },
    });

    const loaded = await loadConfigFromBase(
      { rest: { repos: { getContent } } } as never,
      createPullRequest(),
      '.github/pull-request-policy.yml',
    );

    expect(getContent).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'demo',
      path: '.github/pull-request-policy.yml',
      ref: 'trusted-base-sha',
    });
    expect(loaded.config.policies[0]?.require).toEqual({
      approval_count_at_least: 2,
    });
  });

  it('rejects paths outside the repository before making an API request', async () => {
    const getContent = vi.fn();

    await expect(
      loadConfigFromBase(
        { rest: { repos: { getContent } } } as never,
        createPullRequest(),
        '../untrusted.yml',
      ),
    ).rejects.toThrow(/repository-relative/i);

    expect(getContent).not.toHaveBeenCalled();
  });

  it.each(['', '/tmp/policy.yml', 'directory/../policy.yml'])(
    'rejects invalid repository config path %j',
    async (configPath) => {
      const getContent = vi.fn();

      await expect(
        loadConfigFromBase(
          { rest: { repos: { getContent } } } as never,
          createPullRequest(),
          configPath,
        ),
      ).rejects.toThrow(/repository-relative/i);
      expect(getContent).not.toHaveBeenCalled();
    },
  );

  it('fails with onboarding instructions when the base config is absent', async () => {
    const getContent = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Not Found'), { status: 404 }),
      );

    await expect(
      loadConfigFromBase(
        { rest: { repos: { getContent } } } as never,
        createPullRequest(),
        '.github/pull-request-policy.yml',
      ),
    ).rejects.toThrow(/No policy configuration found/i);
  });

  it('fails closed for malformed config responses and non-404 API errors', async () => {
    const malformedClient = {
      rest: { repos: { getContent: vi.fn().mockResolvedValue({ data: [] }) } },
    };
    await expect(
      loadConfigFromBase(
        malformedClient as never,
        createPullRequest(),
        '.github/pull-request-policy.yml',
      ),
    ).rejects.toThrow(/not a base64 file/i);

    const unavailable = new Error('GitHub unavailable');
    const unavailableClient = {
      rest: { repos: { getContent: vi.fn().mockRejectedValue(unavailable) } },
    };
    await expect(
      loadConfigFromBase(
        unavailableClient as never,
        createPullRequest(),
        '.github/pull-request-policy.yml',
      ),
    ).rejects.toBe(unavailable);
  });
});

function createPullRequest() {
  return {
    owner: 'acme',
    repo: 'demo',
    number: 42,
    baseSha: 'trusted-base-sha',
    baseRef: 'main',
    title: 'Change authentication',
    body: '',
    labels: [],
    requestedReviewers: [],
  };
}
