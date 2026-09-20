import { Buffer } from 'node:buffer';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reporter = {
  info: vi.fn(),
  notice: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  fail: vi.fn(),
  annotate: vi.fn(),
  writeSummary: vi.fn(),
};

const readInputs = vi.fn();
const getOctokit = vi.fn();
const countApprovals = vi.fn();
const listChangedFiles = vi.fn();
const requirePullRequestContext = vi.fn();

vi.mock('../../src/action/inputs', () => ({
  readInputs,
}));

vi.mock('../../src/action/reporter', () => ({
  createGitHubReporter: () => reporter,
}));

vi.mock('@actions/github', () => ({
  context: {},
  getOctokit,
}));

vi.mock('../../src/facts/approvals', () => ({
  countApprovals,
}));

vi.mock('../../src/facts/changed-files', () => ({
  listChangedFiles,
}));

vi.mock('../../src/facts/github-context', () => ({
  requirePullRequestContext,
}));

describe('main', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('runs the action end-to-end with mocked GitHub facts', async () => {
    process.env['GITHUB_TOKEN'] = 'token';
    process.env['RUNNER_TEMP'] = '/tmp';

    readInputs.mockReturnValue({ failOnWarn: false, mode: 'enforce' });
    getOctokit.mockReturnValue({
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              encoding: 'base64',
              content: Buffer.from('policies: {}\n').toString('base64'),
            },
          }),
          getBranchProtection: vi.fn().mockResolvedValue({
            data: {
              required_status_checks: {
                contexts: ['PR Policy / policy'],
              },
              required_pull_request_reviews: {
                require_code_owner_reviews: true,
              },
            },
          }),
        },
      },
    });
    requirePullRequestContext.mockReturnValue({
      owner: 'acme',
      repo: 'demo',
      number: 12,
      baseSha: 'base-sha',
      baseRef: 'main',
      title: 'Deploy change',
      body: 'Includes rollback guidance',
      labels: ['infra'],
      requestedReviewers: ['platform'],
    });
    listChangedFiles.mockResolvedValue({
      all: ['.github/workflows/deploy.yml'],
      added: [],
      removed: [],
      renamed: [],
    });
    countApprovals.mockResolvedValue(2);

    const { main } = await import('../../src/action/main');
    await main();

    expect(getOctokit).toHaveBeenCalledWith('token');
    expect(listChangedFiles).toHaveBeenCalled();
    expect(countApprovals).toHaveBeenCalled();
    expect(reporter.fail).not.toHaveBeenCalled();
    expect(reporter.info).toHaveBeenCalledWith(
      expect.stringContaining('Policy summary:'),
    );
  });

  it('uses inline policy without fetching the base policy file', async () => {
    process.env['GITHUB_TOKEN'] = 'token';
    readInputs.mockReturnValue({
      policy:
        'policies:\n  auth:\n    when:\n      changed: src/auth/**\n    approvals: 2\n',
      failOnWarn: false,
      mode: 'audit',
    });
    const getContent = vi.fn();
    getOctokit.mockReturnValue({
      rest: { repos: { getContent } },
    });
    requirePullRequestContext.mockReturnValue({
      owner: 'acme',
      repo: 'demo',
      number: 12,
      baseSha: 'base-sha',
      baseRef: 'main',
      title: 'Auth change',
      body: '',
      labels: [],
      requestedReviewers: [],
    });
    listChangedFiles.mockResolvedValue({
      all: ['src/auth/login.ts'],
      added: [],
      removed: [],
      renamed: [],
    });
    countApprovals.mockResolvedValue(1);

    const { main } = await import('../../src/action/main');
    await main();

    expect(getContent).not.toHaveBeenCalled();
    expect(reporter.error).toHaveBeenCalledWith(
      expect.stringContaining('auth'),
    );
  });

  it('fails cleanly when no GitHub token is available', async () => {
    readInputs.mockReturnValue({ failOnWarn: false, mode: 'enforce' });

    const { main } = await import('../../src/action/main');
    await main();

    expect(reporter.fail).toHaveBeenCalledWith(
      expect.stringMatching(/github-token input is required/i),
    );
  });
});
