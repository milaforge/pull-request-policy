import type { QuickStartPolicyPresetId } from '../../generator/types';
import type { AppRenderModel, ProtectionOption } from './ui-types';

const OPTIONS: ProtectionOption[] = [
  {
    id: 'title-format',
    title: 'Require conventional titles',
    description: 'Keep titles consistent for review queues and release notes.',
  },
  {
    id: 'pr-body-required',
    title: 'Require meaningful PR descriptions',
    description: 'Keep intent and context visible to reviewers.',
  },
  {
    id: 'tests-for-source-changes',
    title: 'Require tests for source changes',
    description: 'Ask for test changes when configured source paths change.',
  },
  {
    id: 'sensitive-paths',
    title: 'Require 2 approvals for sensitive paths',
    description:
      'Protect workflows, infrastructure, auth, secrets, and deployment files.',
  },
  {
    id: 'release-safety',
    title: 'Require rollout and rollback notes',
    description:
      'Require both notes for risky delivery and operational changes.',
  },
  {
    id: 'docs-runbook-evidence',
    title: 'Require docs or runbook evidence',
    description:
      'Ask for operational documentation when configured paths change.',
  },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function output(
  label: string,
  target: 'workflow' | 'policy',
  path: string,
  value: string,
  copied: boolean,
): string {
  return `<section class="output-card"><div class="output-heading"><div><h2>${label}</h2><p>${escapeHtml(path)}</p></div><div><button type="button" data-action="copy-output" data-target="${target}">${copied ? 'Copied' : 'Copy'}</button><button type="button" data-action="download-output" data-target="${target}">Download</button></div></div><pre><code>${escapeHtml(value)}</code></pre></section>`;
}

function sensitivePathFields(
  enabled: boolean,
  globs: string[],
  approvals: number,
): string {
  if (!enabled) return '';
  return `<div class="preset-fields"><label>Paths to protect <span>comma-separated globs</span><input data-preset-field="sensitive-paths" value="${escapeHtml(globs.join(', '))}" placeholder=".github/workflows/**, infra/**" /></label><label>Minimum trusted approvals<input data-preset-field="sensitive-approvals" type="number" min="0" step="1" value="${approvals}" /></label></div>`;
}

export function renderApp(model: AppRenderModel): string {
  return `<div class="generator-shell"><header class="generator-header"><p class="eyebrow">Pull request policy generator</p><h1>What do you want to protect?</h1><p>Choose protections for your repository. Then copy two files, commit them, and open a pull request.</p></header><section class="protection-list" aria-label="Policy protections">${OPTIONS.map((option) => `<div><label class="protection-option"><input type="checkbox" data-preset-id="${option.id}" ${model.state.presets[option.id].enabled ? 'checked' : ''}><span><strong>${option.title}</strong><small>${option.description}</small></span></label>${option.id === 'sensitive-paths' ? sensitivePathFields(model.state.presets[option.id].enabled, model.state.presets[option.id].globs, model.state.presets[option.id].approvals) : ''}</div>`).join('')}</section><p class="generator-note">These are safe starting points, not a substitute for reviewing the generated policy. For custom rules, see the <a href="https://github.com/milaforge/pull-request-policy/blob/main/docs/configuration.md" target="_blank" rel="noreferrer">configuration reference</a>.</p><div class="output-grid">${output('Workflow YAML', 'workflow', '.github/workflows/policy.yml', model.output.workflowYaml, model.copiedTarget === 'workflow')}${output('Policy YAML', 'policy', '.github/pull-request-policy.yml', model.output.policyYaml, model.copiedTarget === 'policy')}</div><aside class="merge-gate-note"><strong>Make it a merge gate</strong><span>A failed check only blocks merges after GitHub requires this job in branch protection or a ruleset.</span><a href="https://github.com/milaforge/pull-request-policy/blob/main/docs/quick-start.md#3-make-it-a-merge-gate" target="_blank" rel="noreferrer">See the Quick Start instructions →</a></aside>${model.output.errors.length > 0 ? `<div class="alert-danger">${model.output.errors.map((error) => escapeHtml(`${error.path}: ${error.message}`)).join('<br>')}</div>` : ''}</div>`;
}

export function isProtectionId(
  value: string,
): value is QuickStartPolicyPresetId {
  return OPTIONS.some((option) => option.id === value);
}
