# Quick Start

Two files, then open a PR.

## 1. Add the workflow

`.github/workflows/policy.yml`:

```yaml
name: PR Policy
on: [pull_request]

jobs:
  policy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: milaforge/pull-request-policy@025b7c153194f0712f91809bfada9fce35057c46 # v0.1-beta
```

## 2. Add the policy file

`.github/pull-request-policy.yml`:

For common path-based approval rules, use the compact form:

```yaml
policies:
  auth:
    when:
      changed: src/auth/**
    approvals: 2
```

Use the advanced form when you need title, label, body, or file-content predicates, combinators, custom messages, or custom severity. For example, a title rule is written as:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must match: feat|fix|docs|refactor|test|chore: <description>'
```

The compact form defaults to `error` severity and generates its message. Both forms are normalized to the same internal policy model. Push both files. The action will annotate violations and fail the job for `error`-severity rules.

## 3. Make it a merge gate

This is a repository-admin setup step. The Action can fail its workflow job, but a failed job is not automatically a merge restriction. For example, if a PR title violates the `severity: error` policy, GitHub will show the policy job as **failing** and annotate the PR. If the target branch has no rule requiring that job to pass, a user who has permission to merge can still click **Merge** (or merge through the API); the failure is informational rather than a gate.

1. In **Settings → Rules**, protect the branch that receives PRs (for example, `main`) and require the exact `PR Policy / policy` status check, using the label GitHub presents after the first run. A failed check only blocks normal merges after GitHub requires that check; accounts or teams granted an explicit branch-rule bypass can still bypass it.
2. Add `.github/CODEOWNERS`:

   ```text
   /.github/workflows/ @repo-owner
   /.github/pull-request-policy.yml @repo-owner
   /.github/CODEOWNERS @repo-owner
   ```

3. In the same branch rule, enable **Require review from Code Owners**.

Use the GitHub account or team that should approve governance changes in place of `@repo-owner`. Public repositories can use these controls on GitHub Free. Private repositories still receive the action's base-SHA protection, but GitHub may require a paid plan to enforce branch protection and code-owner review.

---

## Common patterns

### Require tests when core code changes

```yaml
policies:
  - id: core-needs-tests
    severity: error
    when:
      changed: ['src/core/**', 'src/security/**']
    require:
      changed: ['tests/**']
    message: 'Core or security changes must include tests.'
```

### Require extra trusted approvals for auth changes

```yaml
policies:
  sensitive:
    when:
      changed: src/auth/**
    approvals: 2
```

### Allow an exemption label

```yaml
policies:
  - id: api-change-needs-changelog
    severity: error
    when:
      changed: ['src/api/public/**']
    require:
      any:
        - changed: ['CHANGELOG.md']
        - has_label: ['skip-changelog']
    message: 'Public API changes must update CHANGELOG.md or carry skip-changelog label.'
```

### Require rollout notes in PR body

```yaml
policies:
  - id: infra-needs-rollout-plan
    severity: error
    when:
      changed: ['infra/**', 'deploy/**']
    require:
      body:
        - '(?i)rollout'
        - '(?i)rollback'
    message: 'Infra changes must mention rollout and rollback in the PR body.'
```

---

For the full predicate syntax and action inputs, see [Configuration Reference](configuration.md).
For more examples, see [Policy Examples](policy-examples.md).
