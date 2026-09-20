import * as core from '@actions/core';
import type { SummaryTableRow } from '@actions/core/lib/summary';

import type { PolicyEvaluation } from '../engine/results';

export interface ActionReporter {
  info(message: string): void;
  notice(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  fail(message: string): void;
  annotate(evaluation: PolicyEvaluation): void;
  writeSummary(evaluations: PolicyEvaluation[]): Promise<void>;
}

export interface ReporterCore {
  info(message: string): void;
  notice(message: string): void;
  warning(message: string, properties?: core.AnnotationProperties): void;
  error(message: string, properties?: core.AnnotationProperties): void;
  setFailed(message: string | Error): void;
  summary: SummaryWriter;
}

interface SummaryWriter {
  addHeading(text: string, level?: number): SummaryWriter;
  addTable(rows: SummaryTableRow[]): SummaryWriter;
  addRaw(text: string): SummaryWriter;
  write(): Promise<unknown>;
}

export function createGitHubReporter(
  reporterCore: ReporterCore = core,
): ActionReporter {
  return {
    info: (message) => reporterCore.info(message),
    notice: (message) => reporterCore.notice(message),
    warning: (message) => reporterCore.warning(message),
    error: (message) => reporterCore.error(message),
    fail: (message) => reporterCore.setFailed(message),
    annotate: (evaluation) => annotateEvaluation(reporterCore, evaluation),
    writeSummary: (evaluations) =>
      writePolicySummary(reporterCore.summary, evaluations),
  };
}

async function writePolicySummary(
  summary: SummaryWriter,
  evaluations: PolicyEvaluation[],
): Promise<void> {
  const passed = evaluations.filter(
    (evaluation) => evaluation.status === 'passed',
  ).length;
  const skipped = evaluations.filter(
    (evaluation) => evaluation.status === 'skipped',
  ).length;
  const violated = evaluations.filter(
    (evaluation) => evaluation.status === 'violated',
  ).length;
  const rows: SummaryTableRow[] = evaluations.map((evaluation) => [
    statusLabel(evaluation.status),
    formatPolicyName(evaluation.id),
    evaluation.status === 'violated'
      ? [evaluation.message, ...evaluation.requireEvidence].join(' ')
      : evaluation.status === 'skipped'
        ? 'not applicable'
        : 'passed',
  ]);

  summary
    .addHeading('PR Policy', 2)
    .addTable([
      [
        { data: 'Status', header: true },
        { data: 'Policy', header: true },
        { data: 'Details', header: true },
      ],
      ...rows,
    ])
    .addRaw(
      `${violated} violation${violated === 1 ? '' : 's'} · ${passed} passed · ${skipped} not applicable`,
    );
  await summary.write();
}

function statusLabel(status: PolicyEvaluation['status']): string {
  return status === 'passed' ? '✓' : status === 'skipped' ? '–' : '✗';
}

function formatPolicyName(id: string): string {
  return id
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((word) =>
      word.toLowerCase() === 'pr'
        ? 'PR'
        : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`,
    )
    .join(' ');
}

function annotateEvaluation(
  reporterCore: ReporterCore,
  evaluation: PolicyEvaluation,
): void {
  const message = `[${evaluation.id}] ${evaluation.message}`;
  const properties = { title: `Policy ${evaluation.id}` };
  if (evaluation.severity === 'error') {
    reporterCore.error(message, properties);
    return;
  }
  reporterCore.warning(message, properties);
}
