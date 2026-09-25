# Shared (scylla-base)

> [Scylla frontend](../../../../README.md) › `extensions/scylla-base` › `shared/` ·
> [agent guide](./AGENTS.md) · [architecture](../../../../docs/architecture.md)

What the Scylla features share and what has a meaning only for Scylla: the Result type of the
backend calls, the presentation of a run status, the instructions to start an agent.

The generic parts — tables, forms, dialogs, the primitives — are in
[`@scylla/ui`](../../../../packages/ui/README.md). This folder holds what fails the test of that
package, *"could this live in another product, unchanged?"*, but is still used by two features.

## `ScyllaResult<T>` — errors as values

Async operations in Scylla do not throw. They return `ScyllaResult<T>`: data sources wrap their
calls in `tryAsync`, so a gRPC failure becomes a `ScyllaError` with the status code and a
user-facing message. At the presentation boundary, query and mutation options call `.unwrap()`
inside `queryFn` / `mutationFn`, so that TanStack Query owns the error state. The `onQueryError`
of the [shell](../shell/README.md) shows the one toast.

`ScyllaResult` is also the contract of other extensions that call the Scylla backend:
[`@scylla/base-sdk`](../../../../sdks/scylla-base-sdk/README.md) exports it.

## One borderline case

`status-config.ts` and `job-status.utils.ts` encode how a status is *presented* — its colour,
icon and label. What a status *means* — whether a job is running or finished — lives in
[features/jobs](../features/jobs/README.md) as domain logic. Keep the line there.
