# Base-SHA Configuration Loading

For a `config-path` input, the action reads the configuration file from the
pull request's **base SHA**: the exact commit on the target branch that the PR
was opened against. It does not read that file from the PR's head branch.

For example, when a PR targets `main`, this configuration:

```yaml
config-path: .github/pull-request-policy.yml
```

loads `.github/pull-request-policy.yml` as it exists on the `main` commit
behind the PR. Changes to that file in the PR do not affect the current PR;
they take effect after the change is merged and a later PR targets it.

This protects the policy that evaluates a PR from being weakened by the same
PR. The action still reads PR facts, such as changed files, labels, approvals,
and targeted file contents, from the PR head.

If a workflow needs to test a policy file changed in the PR itself, use the
`policy` input with inline YAML, or merge the fixture/configuration change to
the base branch first. The `policy` input takes precedence over `config-path`
and is read from the checked-out workflow revision; it is not base-SHA
protected.

See [Configuration Reference](configuration.md) for the available inputs.
