# Pull Request Policy

[![CI](https://github.com/milaforge/pull-request-policy/actions/workflows/ci.yml/badge.svg)](https://github.com/milaforge/pull-request-policy/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue.svg)](https://github.com/marketplace/actions/pull-request-policy)

**Policy as Code for GitHub Pull Requests.**

Define conditional rules for pull requests in YAML and enforce them automatically with GitHub Actions.

GitHub branch protection can require approvals and passing checks. But it cannot easily express rules such as:

> **If authentication code changes, require 2 write-or-higher approvals.**

> **If a workflow changes, require security review.**

> **If the public API changes, require a changelog.**

That's what Pull Request Policy adds.

## GitHub controls vs. Pull Request Policy

| Capability                             | GitHub | Pull Request Policy |
| -------------------------------------- | :----: | :-----------------: |
| Require trusted approvals              |   ✅   |         ✅          |
| Require passing checks                 |   ✅   |          —          |
| Rules based on changed files           |   ❌   |         ✅          |
| Conditional approval requirements      |   ❌   |         ✅          |
| Require labels for specific changes    |   ❌   |         ✅          |
| Require PR description content         |   ❌   |         ✅          |
| Check selected file contents           |   ❌   |         ✅          |
| Combine rules with `all`, `any`, `not` |   ❌   |         ✅          |
| Version-controlled policy as YAML      |   ❌   |         ✅          |
| External service required              |   —    |         ❌          |

## Example

```yaml
policies:
  - id: auth-needs-two-approvals
    when:
      changed: ['src/auth/**']
    require:
      approval_count_at_least: 2
    message: 'Auth changes require at least 2 write-or-higher approvals.'

  - id: workflow-needs-security-review
    when:
      changed: ['.github/workflows/**']
    require:
      has_label: ['security-review']
    message: 'Workflow changes require security review.'
```

The policy lives in `.github/pull-request-policy.yml` and runs as a normal GitHub Action.

**No bot. No webhook server. No database. No external service.**

## Quick Start

Create `.github/workflows/policy.yml`:

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
      - uses: milaforge/pull-request-policy@v0.1-beta
```

Then add `.github/pull-request-policy.yml`:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'Invalid PR title.'
```

Open a pull request. Violations are reported as annotations and `error` policies fail the check.

## What can you check?

| Predicate                 | Checks                    |
| ------------------------- | ------------------------- |
| `changed`                 | Changed files and paths   |
| `exists`                  | Files in the repository   |
| `title`                   | PR title                  |
| `body`                    | PR description            |
| `has_label`               | PR labels                 |
| `approval_count_at_least` | Write-or-higher approvals |
| `file_contains`           | File contents             |

Combine predicates with `all`, `any`, and `not`, and use `when` for conditional policies.

## Why?

**Make repository-specific engineering and security rules executable.**

Pull Request Policy complements branch protection, CODEOWNERS, and security scanners by enforcing rules based on **what a pull request changes**.

## Documentation

- [How It Works](docs/how-it-works.md)
- [Quick Start](docs/quick-start.md)
- [Configuration](docs/configuration.md)
- [Policy Examples](docs/policy-examples.md)
- [Architecture](docs/architecture.md)
- [FAQ](docs/faq.md)

## License

Apache 2.0. See [LICENSE](LICENSE).
