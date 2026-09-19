import { describe, expect, it } from 'vitest';

import { countApprovals } from '../../src/facts/approvals';

describe('countApprovals', () => {
  it('counts only write-or-higher reviewers whose latest review is approved', async () => {
    const requestedPermissions: string[] = [];
    const approvals = await countApprovals(
      {
        paginate: () =>
          Promise.resolve([
            { state: 'APPROVED', user: { login: 'alice' } },
            { state: 'CHANGES_REQUESTED', user: { login: 'alice' } },
            { state: 'APPROVED', user: { login: 'bob' } },
          ]),
        rest: {
          pulls: { listReviews: {} },
          repos: {
            getCollaboratorPermissionLevel: ({
              username,
            }: {
              username: string;
            }) => {
              requestedPermissions.push(username);
              return Promise.resolve({ data: { permission: 'write' } });
            },
          },
        },
      } as never,
      {
        owner: 'acme',
        repo: 'demo',
        number: 1,
        baseSha: 'base-sha',
        baseRef: 'main',
        title: '',
        body: '',
        labels: [],
        requestedReviewers: [],
      },
    );

    expect(approvals).toBe(1);
    expect(requestedPermissions).toEqual(['bob']);
  });

  it('ignores reviews without a login and only counts trusted approvals', async () => {
    const approvals = await countApprovals(
      {
        paginate: () =>
          Promise.resolve([
            { state: 'APPROVED', user: {} },
            { state: 'APPROVED', user: { login: 'carol' } },
          ]),
        rest: {
          pulls: { listReviews: {} },
          repos: {
            getCollaboratorPermissionLevel: () =>
              Promise.resolve({ data: { permission: 'admin' } }),
          },
        },
      } as never,
      {
        owner: 'acme',
        repo: 'demo',
        number: 1,
        baseSha: 'base-sha',
        baseRef: 'main',
        title: '',
        body: '',
        labels: [],
        requestedReviewers: [],
      },
    );

    expect(approvals).toBe(1);
  });

  it('does not count approved reviews from read-only or unknown accounts', async () => {
    const approvals = await countApprovals(
      createClient(
        [
          { state: 'APPROVED', user: { login: 'read-only' } },
          { state: 'APPROVED', user: { login: 'unknown' } },
          { state: 'APPROVED', user: { login: 'writer' } },
        ],
        { 'read-only': 'read', unknown: 'none', writer: 'write' },
      ),
      createPullRequest(),
    );

    expect(approvals).toBe(1);
  });

  it('does not count a reviewer GitHub reports as not a collaborator', async () => {
    const approvals = await countApprovals(
      createClient(
        [{ state: 'APPROVED', user: { login: 'public-reviewer' } }],
        {},
        { 'public-reviewer': 404 },
      ),
      createPullRequest(),
    );

    expect(approvals).toBe(0);
  });

  it('fails closed when an approved reviewer permission cannot be verified', async () => {
    await expect(
      countApprovals(
        createClient(
          [{ state: 'APPROVED', user: { login: 'unavailable' } }],
          {},
        ),
        createPullRequest(),
      ),
    ).rejects.toThrow(/unable to verify repository permission/i);
  });
});

function createClient(
  reviews: Array<{ state: string; user?: { login?: string } }>,
  permissions: Record<string, string>,
  errorStatuses: Record<string, number> = {},
) {
  return {
    paginate: () => Promise.resolve(reviews),
    rest: {
      pulls: { listReviews: {} },
      repos: {
        getCollaboratorPermissionLevel: ({
          username,
        }: {
          username: string;
        }) => {
          const permission = permissions[username];
          const errorStatus = errorStatuses[username];
          if (errorStatus !== undefined) {
            return Promise.reject(
              Object.assign(new Error('GitHub API response'), {
                status: errorStatus,
              }),
            );
          }
          return permission === undefined
            ? Promise.reject(new Error('GitHub API unavailable'))
            : Promise.resolve({ data: { permission } });
        },
      },
    },
  } as never;
}

function createPullRequest() {
  return {
    owner: 'acme',
    repo: 'demo',
    number: 1,
    baseSha: 'base-sha',
    baseRef: 'main',
    title: '',
    body: '',
    labels: [],
    requestedReviewers: [],
  };
}
