# Configuration Reference

The policy engine uses a YAML configuration file to define rules. By default, the action reads `.github/pull-request-policy.yml` from the pull request's base SHA, not from the PR head. A policy change therefore takes effect only after it merges.

## Action Inputs

| Input          | Description                                                            | Default                           |
| :------------- | :--------------------------------------------------------------------- | :-------------------------------- |
| `config-path`  | Optional repository-relative policy file path, read at the PR base SHA | `.github/pull-request-policy.yml` |
| `github-token` | GitHub token for reading the base policy and PR facts                  | `${{ github.token }}`             |
| `fail-on-warn` | Whether to fail the job on warn violations                             | `false`                           |

To make the action a merge gate, protect the target branch and require this policy job’s status check. CODEOWNERS and code-owner review can separately protect the workflow and policy configuration. See [Quick Start](quick-start.md#3-make-it-a-merge-gate).

## Root level

| Key        | Type                     | Description                                                               |
| :--------- | :----------------------- | :------------------------------------------------------------------------ |
| `policies` | `Policy[]` or policy map | Policies to evaluate. The map form is the recommended user-facing syntax. |

## Policy Shape

Each policy defines when it applies and what it requires.

The map form works for every predicate. The key becomes the policy ID, severity
defaults to `error`, and the message is generated when omitted:

```yaml
policies:
  auth:
    when:
      changed: src/auth/**
    require:
      approvals: 2

  title:
    require:
      title: '^(feat|fix): .+'
```

The policy name becomes its ID, severity defaults to `error`, and the action
generates the message. Scalar strings are accepted wherever a predicate accepts
strings; arrays remain supported. Multiple keys under `when` or `require` are
combined with `all`. The map form can also specify `severity`, `description`,
and `message` when needed.

```yaml
policies:
  - id: string # Required. Unique identifier for the policy.
    description: string # Optional. A human-readable description.
    severity: error|warn # Required. 'error' fails the build; 'warn' only annotates (unless fail-on-warn is true).
    when: predicate # Optional. Conditions that must be met for the policy to apply.
    require: predicate # Required. The rule that must be satisfied.
    message: string # Required. The message displayed when the policy is violated.
```

## Predicates

Predicates are the building blocks of policies. They evaluate to true or false based on pull request and repository facts.

### `changed`

Checks if any of the specified file patterns (globs) have changed in the pull request.

```yaml
changed:
  - 'src/**/*.ts'
  - 'package.json'
```

### `exists`

Checks if all of the specified file patterns exist in the repository at the current PR state.

```yaml
exists:
  - '.github/pull-request-policy.yml'
  - 'CODEOWNERS'
```

### `body`

Checks if the pull request **body** matches any of the specified regex patterns.

```yaml
body:
  - 'fixes #\d+'
  - 'runbook'
```

### `title`

Checks if the pull request **title** matches any of the specified regex patterns.

```yaml
title:
  - '^feat:'
  - '^fix:'
```

### `has_label`

Checks if the pull request carries any of the specified labels.

```yaml
has_label:
  - 'security-review'
  - 'deploy-safe'
```

### `approval_count_at_least`

Checks if the pull request has at least the specified number of approvals from reviewers with repository `write` or `admin` permission. Approvals from users with `read`, `triage`, or no repository permission do not count. GitHub maps
the `maintain` base role to `write`, so maintainers count.

```yaml
approval_count_at_least: 2
```

If a reviewer permission cannot be verified, the action fails rather than counting that approval.

### `file_contains`

Checks if specific files contain specific text patterns. This is a targeted check that only reads the requested files.

```yaml
file_contains:
  globs:
    - 'docs/runbooks/**/*.md'
  patterns:
    - 'rollback'
    - 'recovery'
```

## Combinators

Combinators allow you to build complex logic by combining predicates.

### `all`

Passes only if **every** child predicate passes.

```yaml
require:
  all:
    - has_label: ['ready']
    - approval_count_at_least: 1
```

### `any`

Passes if **at least one** child predicate passes.

```yaml
require:
  any:
    - approval_count_at_least: 2
    - has_label: ['fast-track']
```

### `not`

Inverts the result of the child predicate.

```yaml
when:
  not:
    has_label: ['experimental']
```

## Validation Rules

The configuration is strictly validated before execution:

- Unknown top-level or policy keys are rejected.
- Invalid severities are rejected.
- Empty IDs, messages, and arrays are rejected.
- Invalid predicate shapes are rejected.
- Negative approval thresholds are rejected.
