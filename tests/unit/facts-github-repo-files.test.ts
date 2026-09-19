import { describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  collectRepoRequirements,
  readGitHubRepoFiles,
} from '../../src/facts/github-repo-files';

describe('GitHub repository facts', () => {
  it('does not call GitHub when no repository facts are needed', async () => {
    const client = {
      rest: { git: { getTree: vi.fn() }, repos: { getContent: vi.fn() } },
    };

    await expect(
      readGitHubRepoFiles(client as never, {} as never, {
        needsRepoFiles: false,
        fileContentGlobs: [],
      }),
    ).resolves.toEqual({ repoFiles: [], fileContents: {} });
    expect(client.rest.git.getTree).not.toHaveBeenCalled();
  });

  it('requires a head SHA before querying repository facts', async () => {
    await expect(
      readGitHubRepoFiles({} as never, { headSha: '' } as never, {
        needsRepoFiles: true,
        fileContentGlobs: [],
      }),
    ).rejects.toThrow('Pull request head SHA is required');
  });

  it('lists the head tree and reads only content files matching policy globs', async () => {
    const getTree = vi.fn().mockResolvedValue({
      data: {
        tree: [
          { type: 'blob', path: 'README.md' },
          { type: 'blob', path: 'docs/runbook.md' },
          { type: 'tree', path: 'docs' },
        ],
      },
    });
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from('Rollback').toString('base64'),
      },
    });
    const result = await readGitHubRepoFiles(
      { rest: { git: { getTree }, repos: { getContent } } } as never,
      {
        owner: 'acme',
        repo: 'demo',
        number: 1,
        baseSha: 'base',
        headSha: 'head',
        baseRef: 'main',
        title: '',
        body: '',
        labels: [],
        requestedReviewers: [],
      },
      { needsRepoFiles: true, fileContentGlobs: ['docs/**/*.md'] },
    );
    expect(result).toEqual({
      repoFiles: ['README.md', 'docs/runbook.md'],
      fileContents: { 'docs/runbook.md': 'Rollback' },
    });
    expect(getTree).toHaveBeenCalledWith(
      expect.objectContaining({ tree_sha: 'head', recursive: 'true' }),
    );
    expect(getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'docs/runbook.md', ref: 'head' }),
    );
  });

  it('rejects content responses that are not file data', async () => {
    const getTree = vi.fn().mockResolvedValue({
      data: { tree: [{ type: 'blob', path: 'policy.yml' }] },
    });
    const getContent = vi.fn().mockResolvedValue({
      data: { type: 'dir' },
    });

    await expect(
      readGitHubRepoFiles(
        { rest: { git: { getTree }, repos: { getContent } } } as never,
        { owner: 'acme', repo: 'demo', headSha: 'head' } as never,
        { needsRepoFiles: true, fileContentGlobs: ['**/*.yml'] },
      ),
    ).rejects.toThrow('Unable to read repository file "policy.yml"');
  });
});

describe('collectRepoRequirements', () => {
  it('walks nested combinators and collects file predicates', () => {
    expect(
      collectRepoRequirements({
        policies: [
          {
            id: 'nested',
            description: 'nested facts',
            severity: 'error',
            when: {
              all: [
                { exists: ['src/**'] },
                {
                  not: {
                    file_contains: { globs: ['config/**'], patterns: ['x'] },
                  },
                },
              ],
            },
            require: {
              any: [{ file_contains: { globs: ['docs/**'], patterns: ['y'] } }],
            },
            message: 'nested',
          },
        ],
      }),
    ).toEqual({
      needsRepoFiles: true,
      fileContentGlobs: ['config/**', 'docs/**'],
    });
  });

  it('returns no repository requirements for policies without repo predicates', () => {
    expect(
      collectRepoRequirements({
        policies: [
          {
            id: 'metadata-only',
            description: 'metadata',
            severity: 'warn',
            when: { title: ['security'] },
            require: { body: ['details'] },
            message: 'metadata',
          },
        ],
      }),
    ).toEqual({ needsRepoFiles: false, fileContentGlobs: [] });
  });
});
