# Roadmap

## V2: Dependency-impact policies

V2 will address the limits of pure path matching. Changes to shared libraries
can affect authentication, authorization, payments, or other sensitive areas
without directly changing those directories.

The Action will support explicit user-defined impact policies backed by a
dependency graph built locally during CI.

The policy model will remain language agnostic; language-specific graph tooling
may sit behind that boundary, with support limited to accurately understood
languages. CodeGraph may be added as an offline dependency without requiring a
hosted service or dedicated server.

Graph reachability indicates possible impact, not a vulnerability or definite
security behavior change. Sensitive targets will not be inferred. Stale,
unavailable, unsupported, or incomplete graphs will fail enabled `error`
policies rather than silently report no impact; `warn` policies support rollout.
