# Quick Start

Two files, then open a PR.

## 1. Add the workflow

`.github/workflows/policy.yml`:

```yaml
name: pull-request-policy
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - uses: milaforge/pull-request-policy@0.1-beta
```

## 2. Add the policy file

`.github/pull-request-policy.yml`:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must match: feat|fix|docs|refactor|test|chore: <description>'
```

Push both files. The action will annotate violations and fail the job for `error`-severity rules.

---

## Common patterns

### Require tests when core code changes

```yaml
- id: core-needs-tests
  severity: error
  when:
    changed: ['src/core/**', 'src/security/**']
  require:
    changed: ['tests/**']
  message: 'Core or security changes must include tests.'
```

### Require extra trusted approvals for sensitive paths

```yaml
- id: sensitive-paths-need-two-approvals
  severity: error
  when:
    changed: ['.github/workflows/**', 'infra/**', 'src/auth/**']
  require:
    approval_count_at_least: 2
  message: 'Workflow, infra, and auth changes require 2 write-or-higher approvals.'
```

### Allow an exemption label

```yaml
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
