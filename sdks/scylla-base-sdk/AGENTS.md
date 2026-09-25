# `@scylla/base-sdk` — agent guide

The public API of `scylla-base` for the other extensions: `Permission` and `can`, the context
store and `scyllaNavigate`, the gRPC transport, `ScyllaResult`, and the exports of the 14
feature barrels (query factories, entity types, page loaders).

**Package** `sdks/scylla-base-sdk` · entry `@scylla/base-sdk`

## Import rules

- **The only door into scylla-base** (`sdk-is-the-door`, error). An extension imports
  `@scylla/base-sdk`, never `@scylla/base`.
- It is a facade: `src/index.ts` re-exports `@scylla/base/features/*`, `@scylla/base/platform/*`
  and `@scylla/base/scylla-result`. It holds no code of its own, so there is one instance of
  every store.
- **scylla-base never imports its SDK** — that would be a cycle.

## Rules that bite here

- A name exported twice by two barrels breaks the facade: `export *` drops both. Keep the
  names of the barrels unique.
- A query factory exported here runs **outside the owner's route guard**, on the permission
  of the consumer. It must check `can(...)` itself (`jobsByPipelinesQueries` is the model).
- A new feature of scylla-base is one more `export *` line here.
