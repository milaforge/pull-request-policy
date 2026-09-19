# pull-request-policy Agent Guide

This repository is a GitHub Action for policy-as-code in pull requests.

## 1. Mission

The action evaluates a YAML policy file against pull request and repository facts, then warns or fails with clear messages.

## 2. Product Objective

Enable PR guardrails with minimal infrastructure:

- no bot
- no web service
- no database
- no GitHub App
- no external dependencies beyond GitHub and the checked-out repository

## 3. Decision Hierarchy (authoritative)

When rules conflict, resolve in this order:

1. Non-Negotiable Product Constraints
2. Determinism Requirements
3. Reward Function (priority order)
4. Change Acceptance Criteria
5. Engineering Priorities

Lower levels must not violate higher levels.

## 4. Reward Function (optimization targets)

Optimize for:

1. Correct policy decisions
2. Clear user-facing failure messages
3. Deterministic CI behavior
4. Low adoption friction
5. Small, maintainable code
6. Publishable packaging

This defines *what to optimize*, not *what is allowed*.

## 5. Non-Negotiable Product Constraints

- TypeScript GitHub Action (not a bot)
- Human-readable YAML config
- Policy engine model:
  - facts
  - simple predicates
  - composable combinators
  - explicit failure messages

## Missing Config Behavior (authoritative)

If `.github/pull-request-policy.yml` is missing:

- fail CI loudly with a clear, actionable message;
- tell the user to copy `.github/pull-request-policy.yml.example`;
- tell the user to customize and commit `.github/pull-request-policy.yml`;
- link to the Quick Start documentation.

An existing configuration may use `severity: warn` for a gradual rollout. Warn
policies do not fail CI unless `fail-on-warn: true`; this is the supported dry-run
path for MVP and does not require a separate dry-run input.

### Disallowed

- AI features
- AST parsing
- language-specific analysis
- hidden network calls beyond required GitHub API usage

## 6. Determinism Requirements

The action must produce identical results given:

- same PR state
- same repository state
- same config

All evaluation inputs must be:

- fully materialized before execution
- explicitly ordered where needed

Tests must assert deterministic ordering.

---

## 7. MVP Scope (explicit surface area)

### Facts

- changed / added / removed / renamed files
- PR title / body
- labels
- reviewers
- approval count
- file existence
- targeted file content

Fact provenance is part of the product contract:

- PR metadata, reviewers, approvals, and changed-file lists come from the GitHub API;
- file existence and targeted file contents come from the checked-out workspace;
- policy configuration is loaded from the pull request's immutable base commit through the GitHub API.

### Predicates

- `changed(globs)`
- `exists(globs)`
- `body(patterns)`
- `title(patterns)`
- `has_label(labels)`
- `approval_count_at_least(n)`
- `file_contains(globs, patterns)`

### Combinators

- `all`, `any`, `not`

### Expansion Rule

A new capability is allowed only if all are true:

- cannot be expressed with existing primitives
- required in ≥2 independent real-world examples
- reduces config or cognitive load
- fits current mental model

The MVP evaluates `pull_request` workflows. Push-only support is out of scope
because push events do not provide PR reviews, labels, descriptions, or merge-gate
semantics. Do not add a dedicated dry-run input; use `warn` severity for rollout.

## 8. Change Acceptance Criteria (single enforcement gate)

A change is allowed only if:

### Must improve at least one:

- decision correctness (via tests)
- message clarity (via expected outputs)
- determinism
- adoption friction
- code size/complexity (net justified)

### Must NOT:

- add external dependencies
- increase config surface area
- reduce test coverage
- introduce implicit behavior

### Must include:

- failing tests first (for behavior change)
- updated docs if user-visible behavior changes

## 9. Tradeoff Rules

- Never trade correctness for lower priorities
- Determinism overrides performance
- Clarity may justify small code increases
- Adoption improvements must remain explicit
- Code reduction must not reduce readability

## 10. Engineering Principles

- TDD for behavior changes
- strict TypeScript
- pure, deterministic core (`engine`, `predicates`)
- side effects only at edges
- targeted file reads (no full scans)
- small, readable functions
- minimal abstractions

## 11. Error Messages = Product Surface

All outputs must be:

- concise
- actionable
- specific

Missing configuration, invalid configuration, unverified GitHub facts, and policy violations must fail with recovery-oriented instructions. Distinguish an action failure from GitHub blocking a merge: only branch protection or a ruleset requiring the policy job turns a failed check into a normal merge gate.

## 12. Anti-Goals

Do not optimize for:

- general-purpose policy engines
- extensibility frameworks
- non-CI-scale performance
- feature parity with competitors

## 13. Adoption Constraints

Changes must not:

- require extra GitHub permissions
- require changes to consumer workflow YAML

Public onboarding must remain concise and route detail to `docs/`. The README must include installation, why the product complements branch protection and CODEOWNERS, the action-failure versus merge-block distinction, fact provenance, concise troubleshooting, and security boundaries. The FAQ must explain trusted approval semantics, read-only permissions, bypass boundaries, and missing configuration.

## 15. Release Standard

Must pass:

- `pnpm run check`
- `pnpm run validate`

Coverage is required.

---

## 16. Pre-Merge Gate

Must pass:

- Acceptance Criteria satisfied
- Determinism preserved (tests prove it)
- No implicit behavior introduced
- Docs updated if needed

---

## 17. When Unsure

1. Read README
2. Read relevant module
3. Read tests
4. Update tests
5. Make smallest change
6. Run verification

Do not expand scope.
