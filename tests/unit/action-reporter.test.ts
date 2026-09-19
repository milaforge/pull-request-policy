import { describe, expect, it, vi } from 'vitest';

import { createGitHubReporter } from '../../src/action/reporter';

describe('createGitHubReporter', () => {
  it('emits annotations with the matching severity', () => {
    const core = {
      info: vi.fn(),
      notice: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      setFailed: vi.fn(),
      summary: {
        addHeading: vi.fn().mockReturnThis(),
        addTable: vi.fn().mockReturnThis(),
        addRaw: vi.fn().mockReturnThis(),
        write: vi.fn().mockResolvedValue(undefined),
      },
    };
    const reporter = createGitHubReporter(core);

    reporter.info('summary');
    reporter.notice('notice');
    reporter.warning('warn log');
    reporter.error('error log');
    reporter.annotate({
      id: 'warn-rule',
      severity: 'warn',
      status: 'violated',
      message: 'warning text',
      whenEvidence: [],
      requireEvidence: [],
    });
    reporter.annotate({
      id: 'error-rule',
      severity: 'error',
      status: 'violated',
      message: 'error text',
      whenEvidence: [],
      requireEvidence: [],
    });
    reporter.fail('failed');

    expect(core.info).toHaveBeenCalledWith('summary');
    expect(core.notice).toHaveBeenCalledWith('notice');
    expect(core.warning).toHaveBeenCalledWith('warn log');
    expect(core.error).toHaveBeenCalledWith('error log');
    expect(core.warning).toHaveBeenCalledWith('[warn-rule] warning text', {
      title: 'Policy warn-rule',
    });
    expect(core.error).toHaveBeenCalledWith('[error-rule] error text', {
      title: 'Policy error-rule',
    });
    expect(core.setFailed).toHaveBeenCalledWith('failed');
  });

  it('writes a deterministic summary for every policy outcome', async () => {
    const core = {
      info: vi.fn(),
      notice: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      setFailed: vi.fn(),
      summary: {
        addHeading: vi.fn().mockReturnThis(),
        addTable: vi.fn().mockReturnThis(),
        addRaw: vi.fn().mockReturnThis(),
        write: vi.fn().mockResolvedValue(undefined),
      },
    };
    const reporter = createGitHubReporter(core);

    await reporter.writeSummary([
      {
        id: 'pr-title',
        severity: 'error',
        status: 'passed',
        message: 'Title is valid.',
        whenEvidence: [],
        requireEvidence: [],
      },
      {
        id: 'sensitive_paths',
        severity: 'warn',
        status: 'skipped',
        message: 'Sensitive paths need review.',
        whenEvidence: ['No sensitive files changed.'],
        requireEvidence: [],
      },
      {
        id: 'release-safety',
        severity: 'error',
        status: 'violated',
        message: 'Rollback note missing.',
        whenEvidence: [],
        requireEvidence: [],
      },
    ]);

    expect(core.summary.addHeading).toHaveBeenCalledWith('PR Policy', 2);
    expect(core.summary.addTable).toHaveBeenCalledWith([
      [
        { data: 'Status', header: true },
        { data: 'Policy', header: true },
        { data: 'Details', header: true },
      ],
      ['✓', 'PR Title', 'passed'],
      ['–', 'Sensitive Paths', 'not applicable'],
      ['✗', 'Release Safety', 'Rollback note missing.'],
    ]);
    expect(core.summary.addRaw).toHaveBeenCalledWith(
      '1 violation · 1 passed · 1 not applicable',
    );
    expect(core.summary.write).toHaveBeenCalledOnce();
  });
});
