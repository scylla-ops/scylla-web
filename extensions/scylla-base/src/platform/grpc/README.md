# platform / grpc

> [Scylla frontend](../../../../../README.md) › `platform/` › **grpc** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The frontend talks to Scylla over **gRPC-Web**, using clients generated from the backend's
`.proto` files by [protobuf-ts](https://github.com/timostamm/protobuf-ts). This module owns the
transport those clients run on.

Two exports, imported as `@platform/grpc`: the `ScyllaGrpcTransport` class, and `grpcTransport`
— the single shared instance every feature uses.

## One transport, created once

`grpcTransport` is instantiated at import time in `index.ts`, and it is the only instance in the
application. Each feature builds its generated client on it in that feature's
`<feature>.module.ts`:

```typescript
const secretRepository = new DefaultSecretRepository(
  new SecretServiceClient(grpcTransport.getTransport()),
);
```

That is the *only* place it is referenced. Queries, components, repositories and domain files
never see it: a repository receives the client, and depends on its generated interface only.

## Why it is in `platform/` and not in the shell

The composition root would be the textbook home for a shared client. Putting it there was in
fact the original design, and it caused a real problem: a feature that wanted to build its own
gRPC client had to import the shell, while the shell imported every feature to register it. Every
feature and the shell were mutually dependent, and the module graph had a cycle through the
middle of it.

Moving the transport one layer down broke that. `platform/` may not import a feature, and a
feature may import `platform/` — so a module can now declare its own dependencies without
touching the app that assembles them. The cycle is gone, and `pnpm depcruise:cycles` keeps it
that way.

## What it actually does

Three things beyond wrapping the protobuf-ts transport:

1. **Base URL** — from `VITE_API_URL`, so the same build points at any backend.
2. **Authentication** — before each call it reads the session token from `localStorage` and, if
   present, adds `Authorization: Bearer <token>` to the request metadata.
3. **Errors** — every failed call rejects with a `ScyllaError` (see below).

That second point makes the token a contract shared by three modules:
[login](../../features/login/README.md) writes it after a successful sign-in, this transport
reads it on every request, and `AuthGuard` in [shell](../../shell/README.md) reads it to decide
whether a protected route renders. Changing the key means changing all three together.

## Errors are made here, once

An interceptor makes the `RpcError` of each failed call into a `ScyllaError`: the gRPC code, and
the server message, decoded (the server percent-encodes the `grpc-message` trailer, and
protobuf-ts does not decode it). It does this for the unary calls and for the server streams.
A repository only awaits its call: it does not wrap it, and it does not convert the error.

A request that does not get to the server is `UNAVAILABLE`. protobuf-ts gives it `INTERNAL`,
with the text of the browser — and that text is different in each browser ("Failed to fetch",
"Load failed", "NetworkError when attempting to fetch resource."). The transport uses its own
`fetch` to give it the right code, so that the app can tell a network failure from a server
fault: the first is retried and shows "Server unreachable", the second is not.

Because this is in the transport, a new feature or another extension gets it with no code. See
[shared](../../shared/README.md) for `ScyllaError`.

## Generated code and the mapper boundary

Proto clients are generated into `src/generated/` by `pnpm gen-proto`, which runs automatically
as part of `prebuild` before `dev` and `build`. **Never hand-edit them** — the next generation
wipes the change.

Just as importantly, generated types stay in infrastructure. Each feature's
`grpc-{entity}.mapper.ts` converts proto messages into domain entities and structs, and that is where
proto vocabulary ends. When a domain type and a proto type share a name, the proto one is
aliased in the mapper; the domain one carries the `Entity` suffix. A proto type appearing in
`domain/` or `presentation/` is a leak.

## Streaming

Most calls are unary. Log tailing is not: `jobs`' `tailLogs` opens a server stream and returns
its handle **synchronously**. It is the one non-promise method in the codebase, and consumers
are responsible for closing the stream. A failure of the stream ends its iteration with a throw
of a `ScyllaError`. See
[jobs](../../features/jobs/README.md).

## Related modules

- [features/login](../../features/login/README.md) — writes the token this transport reads.
- [shell](../../shell/README.md) — the auth guard reading the same key.
- [`@scylla/core-sdk`](../../../../../sdks/core-sdk/README.md) — how the repositories built on this transport reach the hooks.
- [shared](../../shared/README.md) — `ScyllaError`.
