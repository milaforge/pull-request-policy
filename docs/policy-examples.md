# Policy Examples

These examples use the compact map syntax. Start with the [Quick Start Tutorial](quick-start.md).

## Require tests for queue changes

```yaml
policies:
  queue-change-requires-tests:
    when:
      changed:
        - 'runtime/queue/**'
        - 'runtime/store/**'
    require:
      any:
        - changed: 'tests/**'
        - changed: 'failure_modes/**'
```

## Require a changelog or exemption label

```yaml
policies:
  public-api-change-needs-changelog:
    severity: warn
    when:
      changed: 'api/public/**'
    require:
      any:
        - changed: 'CHANGELOG.md'
        - label: 'release-note-exempt'
```

## Require a deploy label for workflow changes

```yaml
policies:
  workflow-change-needs-label:
    severity: warn
    when:
      changed: '.github/workflows/**'
    require:
      label: 'deploy-change'
```

## Require rollout notes in the PR body

```yaml
policies:
  infra-change-needs-rollout-plan:
    when:
      changed:
        - 'infra/**'
        - 'deploy/**'
    require:
      body:
        - '(?i)rollout'
        - '(?i)rollback'
```
