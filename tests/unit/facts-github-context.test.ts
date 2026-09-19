import { describe, expect, it } from 'vitest';

import { requirePullRequestContext } from '../../src/facts/github-context';

describe('requirePullRequestContext', () => {
  it('extracts pull request metadata from the GitHub context', () => {
    const result = requirePullRequestContext({
      payload: {
        pull_request: {
          number: 4,
          base: { sha: 'base-sha', ref: 'main' },
          title: 'Update deploy workflow',
          body: 'Includes rollback notes',
          labels: [{ name: 'infra' }, { name: 'release-note-exempt' }],
          requested_reviewers: [{ login: 'platform-team' }],
        },
      },
      repo: { owner: 'acme', repo: 'demo' },
    } as never);

    expect(result).toEqual({
      owner: 'acme',
      repo: 'demo',
      number: 4,
      baseSha: 'base-sha',
      baseRef: 'main',
      title: 'Update deploy workflow',
      body: 'Includes rollback notes',
      labels: ['infra', 'release-note-exempt'],
      requestedReviewers: ['platform-team'],
    });
  });

  it('throws when the event is not a pull request', () => {
    expect(() =>
      requirePullRequestContext({
        payload: {},
        repo: { owner: 'acme', repo: 'demo' },
      } as never),
    ).toThrow(/pull_request/i);
  });

  it('throws when the pull request base SHA is unavailable', () => {
    expect(() =>
      requirePullRequestContext({
        payload: {
          pull_request: {
            number: 4,
            title: 'Update deploy workflow',
            body: '',
            labels: [],
            requested_reviewers: [],
            base: {},
          },
        },
        repo: { owner: 'acme', repo: 'demo' },
      } as never),
    ).toThrow(/base SHA/i);
  });
});
