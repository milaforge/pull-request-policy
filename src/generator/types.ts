import type {
  PolicyConfig,
  PredicateExpression,
  Severity,
} from '../config/schema';

export type GeneratorMode = 'quick-start' | 'advanced';

export interface WorkflowOptions {
  actionRef: string;
  failOnWarn: boolean;
  configPath: string;
  mode: 'audit' | 'enforce';
}

export type QuickStartPresetId =
  | 'safe-default'
  | 'title-format'
  | 'pr-body-required'
  | 'tests-for-source-changes'
  | 'sensitive-paths'
  | 'release-safety'
  | 'docs-runbook-evidence';

export type QuickStartPolicyPresetId = Exclude<
  QuickStartPresetId,
  'safe-default'
>;

export interface SafeDefaultPresetState {
  enabled: boolean;
}

export interface TitleFormatPresetState {
  enabled: boolean;
  severity: Severity;
  patterns: string[];
  message: string;
}

export interface PrBodyRequiredPresetState {
  enabled: boolean;
  severity: Severity;
  patterns: string[];
  message: string;
}

export interface TestsForSourceChangesPresetState {
  enabled: boolean;
  severity: Severity;
  sourceGlobs: string[];
  testGlobs: string[];
  message: string;
}

export interface SensitivePathsPresetState {
  enabled: boolean;
  severity: Severity;
  globs: string[];
  approvals: number;
  message: string;
}

export interface ReleaseSafetyPresetState {
  enabled: boolean;
  severity: Severity;
  globs: string[];
  rolloutPatterns: string[];
  rollbackPatterns: string[];
  message: string;
}

export interface DocsRunbookEvidencePresetState {
  enabled: boolean;
  severity: Severity;
  globs: string[];
  evidenceGlobs: string[];
  message: string;
}

export interface QuickStartPresetStateMap {
  'safe-default': SafeDefaultPresetState;
  'title-format': TitleFormatPresetState;
  'pr-body-required': PrBodyRequiredPresetState;
  'tests-for-source-changes': TestsForSourceChangesPresetState;
  'sensitive-paths': SensitivePathsPresetState;
  'release-safety': ReleaseSafetyPresetState;
  'docs-runbook-evidence': DocsRunbookEvidencePresetState;
}

export interface QuickStartState {
  presets: QuickStartPresetStateMap;
}

export type PredicateDraft =
  | { kind: 'predicate'; predicate: 'changed'; globs: string[] }
  | { kind: 'predicate'; predicate: 'exists'; globs: string[] }
  | { kind: 'predicate'; predicate: 'body'; patterns: string[] }
  | { kind: 'predicate'; predicate: 'title'; patterns: string[] }
  | { kind: 'predicate'; predicate: 'has_label'; labels: string[] }
  | {
      kind: 'predicate';
      predicate: 'approval_count_at_least';
      approvals: number | '';
    }
  | {
      kind: 'predicate';
      predicate: 'file_contains';
      globs: string[];
      patterns: string[];
    };

export type CombinatorDraft =
  | { kind: 'combinator'; operator: 'all' | 'any'; children: ExpressionDraft[] }
  | { kind: 'combinator'; operator: 'not'; child?: ExpressionDraft };

export type ExpressionDraft = PredicateDraft | CombinatorDraft;

export interface PolicyDraft {
  uid: string;
  id: string;
  description: string;
  severity: Severity;
  message: string;
  when?: ExpressionDraft | undefined;
  require?: ExpressionDraft | undefined;
}

export interface AdvancedState {
  policies: PolicyDraft[];
  nextPolicyNumber: number;
}

export interface GeneratorState {
  mode: GeneratorMode;
  workflow: WorkflowOptions;
  quickStart: QuickStartState;
  advanced: AdvancedState;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface GeneratorOutput {
  workflowYaml: string;
  policyYaml: string;
  policyConfig?: PolicyConfig | undefined;
  errors: ValidationError[];
}

export interface NormalizedPolicyResult {
  policies?: PolicyConfig['policies'] | undefined;
  errors: ValidationError[];
}

export interface NormalizedExpressionResult {
  expression?: PredicateExpression | undefined;
  errors: ValidationError[];
}
