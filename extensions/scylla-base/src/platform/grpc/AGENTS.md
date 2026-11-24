# `platform/grpc` — agent guide

The single gRPC-Web transport every feature's gRPC client is built on.

**Layer** `platform/` · alias `@platform/grpc`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- Consumers import `@platform/grpc` — the barrel, never a deep path.

## Public API — `index.ts`

```typescript
ScyllaGrpcTransport          the class
grpcTransport                the shared singleton instance: the API, with the token
marketplaceTransport         the marketplace that Scylla hosts: no token unless it is the API
marketplaceUrl, marketplaceIsLocal   where the marketplace is, and whether it is the API
```

## The session in an outage

- `refreshSession` gives `null` only when the server refuses the session
  (`UNAUTHENTICATED`, `PERMISSION_DENIED`). Any other failure rejects: the session can still be
  valid. Never make a failure of the network look like a lost session.
- A call goes with no token only after a refusal of the server. In an outage the call rejects and
  does not go, because the server refuses a call with no token and the handler then ends the
  session.
- The server closes a session when it gets an old refresh token. Thus `refreshSession` takes the
  Web Lock `scylla-session-refresh`, so that the tabs of a browser refresh in turn. A browser
  with no Web Locks (a page that is not on HTTPS or on localhost) refreshes with no lock.

## Where it is used

**Only in `<feature>.module.ts` files**, to build that feature's generated client:

```typescript
const repository = new DefaultXRepository(new XServiceClient(grpcTransport.getTransport()));
```

Never import it in a query, a component, a repository or a domain file. A repository takes the
generated client interface (`IXServiceClient`), never the transport.

Two other files use it, because a capability has no module file: `platform/user-state/index.ts`
and `platform/legal/legal-repository.ts`.

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
- **Attaches auth on every call, unary and stream** (`authorizedFetch`): it sets `authorization` from
  the access token of the session (`session.ts`). The token is in memory only: a call gets a
  refreshed one when it ends soon, and one `UNAUTHENTICATED` answer gets one refresh and one more
  try. A public call (`isPublicCall`) is sent with no token.

The refresh token is in an `HttpOnly` cookie that the server sets: this code never sees it.
`features/login` opens and closes the session through `session.ts`; `localStorage` has `userId` only, not the token.

## Rules that bite here

- **One instance for each server, module-scoped.** `grpcTransport` and `marketplaceTransport`
  are created at import time in `index.ts`. Never send the token of the session to another server.
  Do not construct another `ScyllaGrpcTransport` in a feature — the auth interceptor and the
  base URL would then exist in two places.
- **Every failed call rejects with a `ScyllaError`** (`scyllaErrorInterceptor`), for the unary
  calls and the server streams: the gRPC `code`, the decoded server message, and the name of the
  call (`rpc`: `scylla.secret.v1.SecretService/ListSecrets`), for the log. A repository
  awaits the call and never wraps it. A fake client in a test bypasses the transport: give it
  `failedCall(code)` (`@test/grpc.ts`), and read the error with `ScyllaError.from`.
- **A request that does not get to the server is `UNAVAILABLE`** (`fetchOrUnavailable`), not the
  `INTERNAL` of protobuf-ts. An abort stays `CANCELLED`.
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
