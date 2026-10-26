# `platform/grpc` — agent guide

The single gRPC-Web transport every feature's gRPC client is built on.

**Layer** `platform/` · alias `@platform/grpc`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- Consumers import `@platform/grpc` — the barrel, never a deep path.

## Public API — `index.ts`

```typescript
ScyllaGrpcTransport          the class
grpcTransport                the shared singleton instance
```

## Where it is used

**Only in `<feature>.module.ts` files**, to build that feature's generated client:

```typescript
const repository = new DefaultXRepository(new XServiceClient(grpcTransport.getTransport()));
```

Never import it in a query, a component, a repository or a domain file. A repository takes the
generated client interface (`IXServiceClient`), never the transport.

It lives in `platform/` rather than the composition root precisely so a feature can declare its
own dependencies without importing the app that assembles them — the coupling that previously
made every feature and the shell mutually dependent.

## Layout

```
index.ts                             re-exports the class + creates `grpcTransport`
scylla-grpc-transport.ts             the transport, its error interceptor and its `fetch`
__test__/                            the errors of a refused, a failed and an aborted call
```

## What the transport does

- `baseUrl` from `import.meta.env.VITE_API_URL` (empty string if unset).
- **Attaches auth on every unary call**: reads `localStorage.getItem('token')` and, when present, sets
  `options.meta['Authorization'] = 'Bearer <token>'`.

That `token` key is a three-way contract:

| Who | Does what |
|---|---|
| `features/login`'s repository (`openSession`) | **writes** `token` and `userId` |
| **this module** | **reads** `token` for the header |
| `shell/.../Auth.guard.svelte` | **reads** `token` to allow or redirect |

Changing the key or the storage mechanism means changing all three in one commit.

## Rules that bite here

- **One instance, module-scoped.** `grpcTransport` is created at import time in `index.ts`.
  Do not construct a second `ScyllaGrpcTransport` in a feature — the auth interceptor and the
  base URL would then exist in two places.
- **Every failed call rejects with a `ScyllaError`** (`scyllaErrorInterceptor`), for the unary
  calls and the server streams: the gRPC `code` and the decoded server message. A repository
  awaits the call and never wraps it. A fake client in a test bypasses the transport: give it
  `failedCall(code)` (`@test/grpc.ts`), and read the error with `ScyllaError.from`.
- **A request that does not get to the server is `UNAVAILABLE`** (`fetchOrUnavailable`), not the
  `INTERNAL` of protobuf-ts. An abort stays `CANCELLED`.
- The auth interceptor has no `interceptServerStreaming`: a server stream (`tailJobLogs`) is sent
  without the `Authorization` header.
- Generated proto clients live in `src/generated/` and are **never hand-edited** — run
  `pnpm gen-proto`.
- Proto vocabulary stops at infrastructure. Mappers (`grpc-{entity}.mapper.ts`) convert proto types
  into domain entities/structs; a proto type must never reach `domain/` or `presentation/`.
- Streaming calls (see `jobs`' `tailLogs`) return a handle synchronously rather than a promise.
  Consumers must close them.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
After a `.proto` change: `pnpm gen-proto`.
