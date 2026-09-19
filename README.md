# GitHub Pull Request Policy as Code

[![CI](https://github.com/milaforge/pull-request-policy/actions/workflows/ci.yml/badge.svg)](https://github.com/milaforge/pull-request-policy/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue.svg)](https://github.com/marketplace/actions/pull-request-policy)

Pull Request Policy is a GitHub Action for enforcing conditional pull request
rules with version-controlled YAML. Require the right reviews, labels,
documentation, or PR content based on what a pull request changes.

It complements GitHub branch protection, CODEOWNERS, and security scanners. GitHub
handles repository-wide merge requirements; Pull Request Policy handles rules that
depend on the files, metadata, and context of each pull request.

## Why use it?

GitHub can require approvals and passing checks, but conditional rules are harder
to express:

- Changes under `src/auth/**` require two trusted approvals.
- Workflow changes require a security-review label.
- Public API changes require a changelog entry.
- Infrastructure changes require rollout and rollback notes.

Pull Request Policy runs inside your existing GitHub Actions workflow. It needs no
bot, webhook server, database, GitHub App, or external service.

## Quick start

Add a workflow such as `.github/workflows/policy.yml`:

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

Then create `.github/pull-request-policy.yml`:

Copy `.github/pull-request-policy.yml.sample` as a starting point, then remove
or customize the example policies for your repository. The action fails loudly if
this file is missing; it never silently treats an unconfigured repository as
protected.

```yaml
policies:
  auth:
    when:
      changed: src/auth/**
    approvals: 2
```

Open a pull request. The action reports violations as check annotations and fails
the job for `error` policies. To make that result block merges, require the policy
job in your branch protection or ruleset. See [Quick Start](docs/quick-start.md)
for the merge-gate setup.

The action failing and GitHub blocking a merge are separate things: a failed job
only becomes a merge gate after a repository administrator requires the exact
`PR Policy / policy` status check (as GitHub presents it after the first run)
through branch protection or a ruleset. CODEOWNERS can separately
protect the workflow, policy file, and CODEOWNERS file.

## What it checks

Policies can inspect changed files, repository files, PR titles, PR descriptions,
labels, trusted approvals, and targeted file contents. Combine conditions with
`all`, `any`, and `not`, and use `when` for conditional rules.

The action reads the policy from the pull request's immutable base commit, so a PR
cannot weaken the policy that evaluates that same PR. Policy changes take effect
after they merge.

### Where facts come from

| Data                                             | Source                                          |
| ------------------------------------------------ | ----------------------------------------------- |
| PR title, body, labels, reviewers, and approvals | GitHub API                                      |
| Changed, added, removed, and renamed files       | GitHub API                                      |
| File existence and targeted file contents        | GitHub API at the pull request head SHA         |
| Policy configuration                             | Pull request base commit through the GitHub API |

The action currently runs in `pull_request` workflows. It does not evaluate
push-only workflows because push events do not provide PR reviews, labels, or
descriptions.

## Troubleshooting

- **No policy configuration found** — Copy `.github/pull-request-policy.yml.sample` to `.github/pull-request-policy.yml`, customize it, commit it, and open a new pull request.
- **The check failed but the PR can still merge** — Require the exact `PR Policy / policy` status check in branch protection or a ruleset.
- **An approval was not counted** — Only current approvals from trusted repository collaborators count. See the [FAQ](docs/faq.md#which-approvals-count).
- **Warnings appear but the job passes** — Start with `warn` policies for testing, then use `error` or set `fail-on-warn: true` when ready to enforce.
- **The action says it needs a pull request** — Use a `pull_request` workflow; push-only workflows are not supported in v1.

## Security boundaries

Pull Request Policy uses read-only GitHub permissions and does not change branch
protection, rulesets, CODEOWNERS, or other repository settings. It protects the
policy decision from same-PR edits by loading the policy from the trusted base
commit. Repository administrators and explicitly permitted bypass actors may still
bypass GitHub governance rules.

## Learn more

- [Quick Start](docs/quick-start.md) — installation and merge-gate setup
- [FAQ](docs/faq.md) — permissions, behavior, troubleshooting, and security boundaries
- [Configuration Reference](docs/configuration.md) — inputs, predicates, and validation
- [Policy Examples](docs/policy-examples.md) — common rules to adapt
- [How It Works](docs/how-it-works.md) — evaluation flow and data sources
- [Architecture](docs/architecture.md) — implementation and design constraints
- [Roadmap](docs/roadmap.md) — planned dependency-impact policies for v2

## License

Apache 2.0. See [LICENSE](LICENSE).
