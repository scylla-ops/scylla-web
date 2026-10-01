# `@scylla/base-sdk` — agent guide

The public API of `scylla-base` for the other extensions: `Permission` and `can`, the context
store and `scyllaNavigate`, the gRPC transport, `ScyllaResult`, and the exports of the 15
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

## Widget points exported here

Full mechanism: `widgets_plan.md` at the repo root. Every points object a feature exports (its
`index.ts` export of a `definePoints(...)` result) reaches a contributor through this barrel —
unchanged, since it is already covered by `export * from '@scylla/base/features/*'`. This table
exists so a contributor finds every point without opening each feature's own `AGENTS.md`, and a
test (`sdks/scylla-base-sdk/src/__test__/points-documented.test.ts`) checks nothing exported here
is missing from it.

| Points object | Scope | Points | Owning feature |
|---|---|---|---|
| `loginPoints` | `login` | `login.footer` (zone), `login.texts` (text scope), `login.fields` (value) | [`login`](../../extensions/scylla-base/src/features/login/AGENTS.md) |

Add a row here in the same change that adds a `definePoints(...)` export to a feature's barrel.
