import { describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import { readGitHubRepoFiles } from '../../src/facts/github-repo-files';

describe('GitHub repository facts', () => {
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
});
