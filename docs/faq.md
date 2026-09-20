# FAQ

## What is Pull Request Policy?

**Pull Request Policy** is a GitHub Action for enforcing **Policy as Code on pull requests**.

Policies are defined in YAML and can make requirements conditional on changed files, approvals, labels, PR titles, PR descriptions, and file contents.

Approval-count policies only count current approvals from reviewers with repository `write` or `admin` permission. They complement, rather than replace, GitHub branch protection and CODEOWNERS.

## How does it complement GitHub branch protection and CODEOWNERS?

GitHub branch protection and rulesets enforce repository-wide requirements such as
passing checks, required approvals, and restrictions on who can merge. CODEOWNERS
assigns review responsibility for protected paths. Pull Request Policy adds
conditional rules that depend on the pull request's changed files and metadata.

For example, branch protection can require the policy check to pass, CODEOWNERS can
protect `.github/workflows/**`, and this action can require an additional label or
approval count when those paths change. The action does not configure or replace
any GitHub governance setting.

## Why is it a GitHub Action instead of a bot?

Pull Request Policy is designed for **zero-infrastructure policy enforcement**.

It runs inside your existing GitHub Actions workflow. There is no hosted bot, webhook server, database, or external service to operate.

## Where do I define my policies?

By default, policies are defined in:

```text
.github/pull-request-policy.yml
```

And the workflow file only runs the action:

```text
.github/workflows/policy.yml
```

You can use another policy file by setting the `config-path` input.

## What happens if the policy file is missing?

The action fails loudly when no configuration is found. Copy `.github/pull-request-policy.yml.sample` to your `.github/pull-request-policy.yml`, customize it for the repository, commit it, and open a new pull request.

An existing configuration can still use `warn` policies for a gradual rollout.
Warnings are reported without failing the job. Change a policy to `error` when it
should block in enforce mode.

## Does it read the whole repository?

No.

The action only reads repository data required by the active policies. For example, `file_contains` reads only files matched by the policy's specified globs.

## What happens when a policy is violated?

Policies have either `error` or `warn` severity.

- `error` violations fail the GitHub Actions check.
- `warn` violations are reported without failing the check.

Violations are reported as pull request annotations.

## Which approvals count?

Only current approvals from reviewers with repository `write` or `admin` permission count toward the compact `approvals` rule. GitHub's `maintain` role is treated as `write`; read, triage, and unknown permissions do not count.

The action verifies each reviewer's repository permission through the GitHub API.
If GitHub returns an unexpected error while checking permission, the action fails closed instead of treating the approval as trusted. A GitHub approval by itself is not equivalent to a trusted approval.

## What permissions does it need?

The recommended permissions are:

```yaml
permissions:
  contents: read
  pull-requests: read
```

These provide the read access required to evaluate pull request metadata and repository files.

The action is intended to run on `pull_request` events. It requires a pull request context and is not a general-purpose check for `push` workflows. It reads repository facts from GitHub's API and does not need a checkout step.

## Can I combine multiple conditions?

Yes.

Use `all`, `any`, and `not` to combine predicates, and `when` to make a policy conditional.
Use the compact map fields shown in the [Configuration Reference](configuration.md).

For example:

```yaml
require:
  all:
    - approvals: 2
    - label:
        - security-review
```

## Can it replace branch protection or CODEOWNERS?

No.

Pull Request Policy complements GitHub branch protection, CODEOWNERS, and security scanning tools.

Its purpose is to enforce **conditional repository policies based on pull request context**.

## Can I test policies locally?

Yes. Contributors can install dependencies and run the repository checks locally.
See [Contributing](contributing.md) for the development and validation commands.

Consumer policies are evaluated against real GitHub pull request facts, so the most representative test is a pull request using a temporary `warn` policy before changing rules to `error`.

## What happens when GitHub data cannot be verified?

The action fails closed when required facts cannot be trusted. For example, if a reviewer's repository permission cannot be verified, that approval is not counted;
an unexpected GitHub API error fails the action rather than silently passing the policy. This protects approval-based rules from incomplete authorization data.

## Can I use it without a paid GitHub plan?

The action itself does not require a paid plan and its base-commit policy protection works without CODEOWNERS or branch protection. Public repositories can use GitHub's available branch protection and code-owner controls on GitHub Free. Private-repository availability of particular governance features depends on the repository's GitHub plan. Check GitHub's current plan limits before relying on a specific ruleset or code-owner feature.

## What if a user has permission to bypass the rules?

The action can fail its check and GitHub can require that check for normal merges, but repository administrators or explicitly permitted bypass actors may still be able to bypass branch rules. Review the repository's bypass list when the policy is part of a security or release control.

## Is it a security scanner?

Not by itself.

Pull Request Policy is a **policy enforcement layer**. It can enforce security-related requirements—for example, requiring additional review when `.github/workflows/**` changes—but it does not replace SAST, SCA, secret scanning, IaC scanning, or other security analysis tools.
