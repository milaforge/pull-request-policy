import type { WorkflowOptions } from './types';
import { POLICY_ACTION_SHA, POLICY_ACTION_VERSION } from './action-refs';

function appendLine(lines: string[], level: number, value: string): void {
  lines.push(`${'  '.repeat(level)}${value}`);
}

export function generateWorkflowYaml(options: WorkflowOptions): string {
  const lines: string[] = [];
  appendLine(lines, 0, 'name: PR Policy');
  appendLine(lines, 0, 'on: [pull_request]');
  appendLine(lines, 0, 'jobs:');
  appendLine(lines, 1, 'policy:');
  appendLine(lines, 2, 'runs-on: ubuntu-latest');
  appendLine(lines, 2, 'permissions:');
  appendLine(lines, 3, 'contents: read');
  appendLine(lines, 3, 'pull-requests: read');
  appendLine(lines, 2, 'steps:');
  appendLine(
    lines,
    3,
    `- uses: milaforge/pull-request-policy@${options.actionRef}${
      options.actionRef === POLICY_ACTION_SHA
        ? ` # ${POLICY_ACTION_VERSION}`
        : ''
    }`,
  );

  if (
    options.mode !== 'enforce' ||
    options.configPath !== '.github/pull-request-policy.yml'
  ) {
    appendLine(lines, 4, 'with:');
    if (options.configPath !== '.github/pull-request-policy.yml') {
      appendLine(lines, 5, `config-path: ${options.configPath}`);
    }
    if (options.mode !== 'enforce') {
      appendLine(lines, 5, `mode: ${options.mode}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
