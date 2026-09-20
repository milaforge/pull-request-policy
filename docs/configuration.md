# Configuration Reference

The policy engine uses a YAML configuration file to define rules. By default, the action reads `.github/pull-request-policy.yml` from the pull request's base SHA, not from the PR head. A policy change therefore takes effect only after it merges.

## Action Inputs

| Input          | Description                                                                                                | Default                           |
| :------------- | :--------------------------------------------------------------------------------------------------------- | :-------------------------------- |
| `policy`       | Optional inline YAML policy for quick starts. Takes precedence over `config-path`; not base-SHA protected. | empty                             |
| `config-path`  | Optional repository-relative policy file path, read at the PR base SHA                                     | `.github/pull-request-policy.yml` |
| `github-token` | GitHub token for reading the base policy and PR facts                                                      | `${{ github.token }}`             |
| `mode`         | `audit` reports violations without failing; `enforce` fails `error` violations                             | `enforce`                         |

Use `mode: audit` while trialing policies on real pull requests, then switch to `mode: enforce`. To make the action a merge gate, protect the target branch and require this policy job’s status check. CODEOWNERS and code-owner review can separately protect the workflow and policy configuration. See [Quick Start](quick-start.md#make-it-a-merge-gate).

## Root level

| Key        | Type       | Description                                            |
| :--------- | :--------- | :----------------------------------------------------- |
| `policies` | policy map | Policies to evaluate. The map key is each policy's ID. |

## Policy Shape

Each policy defines when it applies and what it requires.

Use the policy map syntax for new configuration. The key becomes the policy ID,
severity defaults to `error`, and the message is generated automatically:

```yaml
policies:
  auth:
    when:
      changed: src/auth/**
    approvals: 2

  title:
    require:
      title: '^(feat|fix): .+'
```

The supported compact fields are `when`, `changed`, `title`, `body`, `label`,
`approvals`, and `file_contains`. Scalar strings are accepted wherever a
predicate accepts strings; arrays remain supported. Add `severity` or
`description` only when needed. Multiple conditions can be combined with
`all`, `any`, and `not`.

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

### `label`

Checks if the pull request carries any of the specified labels.

```yaml
label:
  - 'security-review'
  - 'deploy-safe'
```

### `approvals`

Checks if the pull request has at least the specified number of approvals from reviewers with repository `write` or `admin` permission. Approvals from users with `read`, `triage`, or no repository permission do not count. GitHub maps
the `maintain` base role to `write`, so maintainers count.

```yaml
approvals: 2
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
    - label: ['ready']
    - approvals: 1
```

### `any`

Passes if **at least one** child predicate passes.

```yaml
require:
  any:
    - approvals: 2
    - label: ['fast-track']
```

### `not`

Inverts the result of the child predicate.

```yaml
when:
  not:
    label: ['experimental']
```

## Validation Rules

The configuration is strictly validated before execution:

- Unknown top-level or policy keys are rejected.
- Invalid severities are rejected.
- Empty IDs, messages, and arrays are rejected.
- Invalid predicate shapes are rejected.
- Negative approval thresholds are rejected.
