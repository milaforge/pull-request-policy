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
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: milaforge/pull-request-policy@025b7c153194f0712f91809bfada9fce35057c46 # v0.1-beta
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

## 3. Make it a merge gate

This is a repository-admin setup step. The Action can fail its workflow job, but a failed job is not automatically a merge restriction. For example, if a PR title violates the `severity: error` policy, GitHub will show the policy job as **failing** and annotate the PR. If the target branch has no rule requiring that job to pass, a user who has permission to merge can still click **Merge** (or merge through the API); the failure is informational rather than a gate.

1. In **Settings → Rules**, protect the branch that receives PRs (for example, `main`). Require the exact status check produced by this policy job. GitHub then evaluates the check as part of the branch rule: while the policy job is failing, the PR is not mergeable through the normal GitHub merge path; if the job has not completed, it is also blocked as a required check. The rule therefore turns the Action's result into a GitHub-enforced merge condition. Accounts or teams granted an explicit branch-rule bypass can still bypass that condition, so review your bypass list as part of the repository's governance.
2. Add `.github/CODEOWNERS`:

   ```text
   /.github/workflows/ @repo-owner
   /.github/pull-request-policy.yml @repo-owner
   /.github/CODEOWNERS @repo-owner
   ```

3. In the same branch rule, enable **Require review from Code Owners**.

Use the GitHub account or team that should approve governance changes in place of `@repo-owner`. Public repositories can use these controls on GitHub Free. Private repositories still receive the action's base-SHA protection, but GitHub may require a paid plan to enforce branch protection and code-owner review.

The action emits advisory CI notices when it cannot find a CODEOWNERS file, required status checks are absent, or required code-owner review is disabled. It cannot verify which specific job is selected as a required check or whether CODEOWNERS patterns cover every protected path; confirm those in the branch-rule UI.

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
