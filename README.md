# GitHub Pull Request Policy as Code

[![CI](https://github.com/milaforge/pull-request-policy/actions/workflows/ci.yml/badge.svg)](https://github.com/milaforge/pull-request-policy/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue.svg)](https://github.com/marketplace/actions/pull-request-policy)

Pull Request Policy is a GitHub Action for conditional pull request rules in
version-controlled YAML. Require the right review, label, documentation, or PR
content based on what a pull request changes—without a bot, server, database, or
GitHub App.

## Start with a policy

For the fastest first run, keep the workflow and policy together:

```yaml
name: PR Policy
on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  policy:
    permissions:
      contents: read
      pull-requests: read
    runs-on: ubuntu-latest
    steps:
      - uses: milaforge/pull-request-policy@aca1e55764b494ef7976ae6f64621fb3adb833de # v1
        with:
          mode: audit
          policy: |
            policies:
              auth:
                when:
                  changed: src/auth/**
                approvals: 2
```

Inline `policy` is a convenient quick-start mode. When the policy grows, move
it to `.github/pull-request-policy.yml`; the file is loaded from the pull
request's immutable base SHA and is the recommended production mode.

[Open the policy generator](https://milaforge.github.io/pull-request-policy/) to choose protections and copy the
workflow and policy files into your repository. For a manual starting point,
add the action to a `pull_request` workflow, then create
`.github/pull-request-policy.yml`:

```yaml
policies:
  auth:
    when:
      changed: src/auth/**
    approvals: 2
```

This says: when a pull request changes `src/auth/**`, it needs two trusted
approvals. The [Quick Start](docs/quick-start.md) has the complete workflow and
more examples.

When a pull request does not meet a rule, the check reports the policy and the
reason, for example:

> `auth`: requires 2 trusted approvals; found 1

Each run also writes a `PR Policy` step summary with passed, violated, and not
applicable policies.

## Ready to enforce?

A failed Action check prevents the pull request from merging only after you
require the exact `PR Policy / policy` status check in GitHub Rules (branch
protection or a ruleset). Until then, the Action can report a failure while
GitHub still allows an authorized user to merge. See [Make it a merge
gate](docs/quick-start.md#make-it-a-merge-gate).

For a gradual rollout, use `severity: warn`; warnings are reported without
failing the job. Switch policies to `error` when you are ready to enforce them.

## Troubleshooting

- **No policy configuration found** — Copy `.github/pull-request-policy.yml.sample` to `.github/pull-request-policy.yml`, customize it, commit it, and open a new pull request.
- **The check failed but the PR can still merge** — After the first workflow run, go to **Settings → Rules → Rulesets**, enable **Require status checks to pass**, choose **Add checks**, select the exact `PR Policy / policy` check, and save the ruleset.
- **I want to trial the policy safely** — Set the workflow input to `mode: audit`. It reports violations without failing the job; switch to `mode: enforce` when the results are understood. Alternatively, use `severity: warn` for policies that should remain non-blocking while other policies enforce.
- **An approval was not counted** — Only current approvals from trusted repository collaborators count. See [Which approvals count?](docs/faq.md#which-approvals-count).
- **The action says it needs a pull request** — Use a `pull_request` workflow; push-only workflows are not supported in v1.

## Learn more

- [Quick Start](docs/quick-start.md) — installation, rollout, and merge gates
- [Configuration Reference](docs/configuration.md) — predicates, combinators, and inputs
- [Policy Examples](docs/policy-examples.md) — rules to adapt
- [How It Works](docs/how-it-works.md) — evaluation flow, facts, and base-SHA behavior
- [FAQ](docs/faq.md) — permissions, trusted approvals, failure behavior, and security boundaries
- [Architecture](docs/architecture.md) — implementation and design constraints
- [Roadmap](docs/roadmap.md) — planned dependency-impact policies for v2

The action currently evaluates `pull_request` workflows. It uses read-only
GitHub permissions and does not configure branch protection, rulesets, or
CODEOWNERS. The deeper documentation explains fact provenance, immutable base
configuration, approval authorization, predicate semantics, and bypass
boundaries.

## License

Apache 2.0. See [LICENSE](LICENSE).
