import type { PolicyConfig } from '../config/schema';
import {
  loadConfig,
  loadConfigFromPath,
  loadConfigFromSource,
  DEFAULT_CONFIG_PATH,
  type LoadedConfig,
} from '../config/load-config';
import { evaluatePolicy } from '../engine/evaluate-policy';
import { collectPolicyFacts } from '../facts/collect-facts';
import {
  requirePullRequestContext,
  type PolicyFacts,
} from '../facts/github-context';

import { loadConfigFromBase } from './base-config';
import { readInputs, type ActionInputs } from './inputs';
import { createGitHubReporter, type ActionReporter } from './reporter';
import * as github from '@actions/github';

export interface ActionRunResult {
  errorViolations: number;
  warningViolations: number;
}

export interface ActionDependencies {
  inputs: ActionInputs;
  reporter: ActionReporter;
  factsProvider: (config: PolicyConfig) => Promise<PolicyFacts>;
  cwd?: string | undefined;
  runnerTemp?: string | undefined;
  configLoader?: (() => Promise<LoadedConfig>) | undefined;
}

/**
 * Main action orchestration logic.
 */
export async function runAction(
  dependencies: ActionDependencies,
): Promise<ActionRunResult> {
  const loaded = await readConfig(dependencies);
  for (const notice of loaded.notices) {
    dependencies.reporter.notice(notice);
  }

  const facts = await dependencies.factsProvider(loaded.config);
  const evaluations = loaded.config.policies.map((policy) =>
    evaluatePolicy(policy, facts),
  );

  const errorViolations = countViolations(evaluations, 'error');
  const warningViolations = countViolations(evaluations, 'warn');

  reportEvaluations(dependencies.reporter, evaluations);
  await dependencies.reporter.writeSummary(evaluations);

  dependencies.reporter.info(
    `Policy summary: ${errorViolations} error violation(s), ${warningViolations} warning violation(s).`,
  );

  if (shouldFail(errorViolations, dependencies.inputs.mode)) {
    dependencies.reporter.fail(createFailureMessage(errorViolations));
  }

  return {
    errorViolations,
    warningViolations,
  };
}

async function readConfig(
  dependencies: ActionDependencies,
): Promise<Awaited<ReturnType<typeof loadConfig>>> {
  if (dependencies.configLoader !== undefined) {
    return dependencies.configLoader();
  }
  if (dependencies.inputs.policy !== undefined) {
    return loadConfigFromSource(dependencies.inputs.policy, '<policy input>');
  }
  const configPath = dependencies.inputs.configPath;
  if (configPath !== undefined) {
    return loadConfigFromPath(configPath);
  }
  return loadConfig({
    cwd: dependencies.cwd,
    runnerTemp: dependencies.runnerTemp,
  });
}

function countViolations(
  evaluations: ReturnType<typeof evaluatePolicy>[],
  severity: 'error' | 'warn',
): number {
  return evaluations.filter(
    (e) => e.status === 'violated' && e.severity === severity,
  ).length;
}

function reportEvaluations(
  reporter: ActionReporter,
  evaluations: ReturnType<typeof evaluatePolicy>[],
): void {
  const violated = evaluations.filter(
    (evaluation) => evaluation.status === 'violated',
  );
  reportViolations(reporter, violated, 'error');
  reportViolations(reporter, violated, 'warn');
}

function reportViolations(
  reporter: ActionReporter,
  evaluations: ReturnType<typeof evaluatePolicy>[],
  severity: 'error' | 'warn',
): void {
  const messages = evaluations
    .filter((evaluation) => evaluation.severity === severity)
    .map((evaluation) => {
      const evidence = evaluation.requireEvidence.join(' ');
      return evidence === ''
        ? `- [${evaluation.id}]`
        : `- [${evaluation.id}] ${evidence}`;
    });
  if (messages.length === 0) return;

  const label = severity === 'error' ? 'violation' : 'warning';
  const report = [
    `Pull Request Policy ${label}:`,
    '',
    `The following requirements are not met by this PR:`,
    '',
    ...messages,
  ].join('\n');

  if (severity === 'error') {
    reporter.error(report);
  } else {
    reporter.warning(report);
  }
}

function shouldFail(
  errorViolations: number,
  mode: ActionInputs['mode'],
): boolean {
  if (mode === 'audit') return false;
  return errorViolations > 0;
}

function createFailureMessage(errorViolations: number): string {
  return `Policy check failed: ${errorViolations} error violation(s). See the annotations above for details.`;
}

/**
 * Entry point for the GitHub Action.
 */
export async function main(): Promise<void> {
  const inputs = readInputs();
  const reporter = createGitHubReporter();

  try {
    const token = inputs.githubToken ?? process.env['GITHUB_TOKEN'];
    if (!token?.trim()) {
      throw new Error('github-token input is required for pull request facts.');
    }
    const client = github.getOctokit(token);
    const pullRequest = requirePullRequestContext(github.context);
    const dependencies: ActionDependencies = {
      inputs,
      reporter,
      runnerTemp: process.env['RUNNER_TEMP'],
      configLoader: () =>
        inputs.policy !== undefined
          ? Promise.resolve(
              loadConfigFromSource(inputs.policy, '<policy input>'),
            )
          : loadConfigFromBase(
              client,
              pullRequest,
              inputs.configPath ?? DEFAULT_CONFIG_PATH,
            ),
      factsProvider: async (config) => {
        return collectPolicyFacts(client, config);
      },
    };

    await runAction(dependencies);
  } catch (error) {
    reporter.fail(error instanceof Error ? error.message : String(error));
  }
}
