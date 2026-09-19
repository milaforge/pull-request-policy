import { describe, expect, it } from 'vitest';

import { listChangedFiles } from '../../src/facts/changed-files';

describe('listChangedFiles', () => {
  it('groups files by change type', async () => {
    const files = await listChangedFiles(
      {
        paginate: () =>
          Promise.resolve([
            { filename: 'src/a.ts', status: 'modified' },
            { filename: 'src/b.ts', status: 'added' },
            { filename: 'src/c.ts', status: 'removed' },
            { filename: 'src/d.ts', status: 'renamed' },
          ]),
        rest: { pulls: { listFiles: {} } },
      } as never,
      {
        owner: 'acme',
        repo: 'demo',
        number: 7,
        baseSha: 'base-sha',
        baseRef: 'main',
        title: '',
        body: '',
        labels: [],
        requestedReviewers: [],
      },
    );

    expect(files.all).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts']);
    expect(files.added).toEqual(['src/b.ts']);
    expect(files.removed).toEqual(['src/c.ts']);
    expect(files.renamed).toEqual(['src/d.ts']);
  });
});
