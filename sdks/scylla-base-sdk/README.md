# `@scylla/base-sdk`

> [Scylla frontend](../../README.md) › `sdks/scylla-base-sdk` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

What an extension may use of Scylla. A `scylla-cloud` extension that adds billing pages to an
organization reads the active organization from `contextStore`, gates its pages with
`Permission`, calls the backend with `grpcTransport` and returns `ScyllaResult`s — all from
this package.

## Why a facade

The public API of scylla-base already exists: it is the `index.ts` of each feature and of
each `platform/` capability. The SDK gathers them in one package and adds nothing. So there
is one copy of every store and one query cache, and a feature's public API stays where its
owners maintain it.

The SDK is what makes the boundary checkable: dependency-cruiser refuses an import of
`@scylla/base` from any other extension, so the day an extension needs something new of
scylla-base, the change is an export in a barrel — visible, and reviewed by its owners.
