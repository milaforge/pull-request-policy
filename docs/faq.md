# FAQ

## What is Pull Request Policy?

**Pull Request Policy** is a GitHub Action for enforcing **Policy as Code on pull requests**.

Policies are defined in YAML and can make requirements conditional on changed files, approvals, labels, PR titles, PR descriptions, and file contents.

Approval-count policies only count current approvals from reviewers with repository `write` or `admin` permission. They complement, rather than replace, GitHub branch protection and CODEOWNERS.

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

The action runs in **advisory mode** when no configuration is found. It generates a temporary configuration and does not unexpectedly block pull requests.

This makes it possible to introduce the action without immediately breaking existing workflows.

## Does it read the whole repository?

No.

The action only reads repository data required by the active policies. For example, `file_contains` reads only files matched by the policy's specified globs.

## What happens when a policy is violated?

Policies have either `error` or `warn` severity.

- `error` violations fail the GitHub Actions check.
- `warn` violations are reported without failing the check by default.
- Set `fail-on-warn: true` to make warnings fail the job.

Violations are reported as pull request annotations.

## What permissions does it need?

The recommended permissions are:

```yaml
permissions:
  contents: read
  pull-requests: read
```

These provide the read access required to evaluate pull request metadata and repository files.

## Can I combine multiple conditions?

Yes.

Use `all`, `any`, and `not` to combine predicates, and `when` to make a policy conditional.

For example:

```yaml
require:
  all:
    - approval_count_at_least: 2
    - has_label:
        - security-review
```

## Can it replace branch protection or CODEOWNERS?

No.

Pull Request Policy complements GitHub branch protection, CODEOWNERS, and security scanning tools.

Its purpose is to enforce **conditional repository policies based on pull request context**.

## Can I test policies locally?

Yes.

See the [Local Development](../README.md#local-development) documentation for instructions on running the test suite and evaluating policies locally.

## Is it a security scanner?

Not by itself.

Pull Request Policy is a **policy enforcement layer**. It can enforce security-related requirements—for example, requiring additional review when `.github/workflows/**` changes—but it does not replace SAST, SCA, secret scanning, IaC scanning, or other security analysis tools.
