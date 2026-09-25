# `shared` (scylla-base) — agent guide

The code that two or more Scylla features share **and that has a business meaning**, so it
cannot go to `@scylla/ui`.

**Folder** `extensions/scylla-base/src/shared/` · alias `@shared/*` (scylla-base only)

## Import rules

- **`shared/` MUST NOT import `features/`, `shell/` or `platform/`** (`shared-is-generic`, error).
  It may import `@scylla/ui` and `@scylla/core-sdk`.
- The features of scylla-base import it by path (`@shared/utils/scylla-result.ts`). No other
  extension does: `ScyllaResult` reaches them through `@scylla/base-sdk`.
- Generic UI does not go here. Could it live in another product, unchanged? Then it goes to
  [`@scylla/ui`](../../../../packages/ui/AGENTS.md).

## Structure

```
utils/
  scylla-result.ts                   ScyllaResult<T>, ScyllaError — exported by @scylla/base-sdk
  date-utils.ts, slug.ts, status-config.ts, job-status.utils.ts, toast-messages.ts
infrastructure/grpc/wrappers.ts      proto helpers
presentation/ui/index.ts             `@shared/presentation/ui`
  data-display/                      StatusBar, STATUS_ICONS / getStatusIcon, AgentRunInstructions
locales/                             the catalog of these files
```

## `ScyllaResult<T>` — the error contract

Every async operation returns `ScyllaResult<T>`, never a raw throw.

```typescript
const result = await ScyllaResult.tryAsync(() => api.call(), 'Error message');
result.fold({ onSuccess: data => …, onError: err => … });
const data = result.unwrap();          // throws — do this inside queryFn/mutationFn
```

- Data sources wrap with `tryAsync`; `ScyllaError` extracts the gRPC code.
- `getCode()` returns `ScyllaErrorCode`, not `string`: the gRPC-Web status names (derived from
  `GrpcStatusCode`, imported as a type only — nothing lands in the bundle) plus the codes we
  mint. A code compared anywhere must exist in that union, so add yours there first.
- Query and mutation options call `.unwrap()` **inside** `queryFn` / `mutationFn` so TanStack
  Query owns the error.
- `map` / `flatMapAsync` chain without unwrapping (see `UpdateRoleUseCase`).
- `mapError` rewrites the failure of a result and leaves a success untouched — use it in a data
  source when a generic gRPC code means something more precise for that one call (see
  [`login`](../features/login/AGENTS.md)), rather than special-casing it in every consumer.
- **Do not add an `onError` toast to a query or a mutation.** `reportQueryError`
  (`shell/presentation/report-query-error.ts`, the `onQueryError` of `ShellModule`) already
  toasts every error, and you would double it.

## Rules that bite here

- `status-config.ts` / `job-status.utils.ts` are borderline — they encode status *presentation*
  (colour, icon, label), not business rules. Keep it that way; job semantics belong in
  `features/jobs`.
- Adding to `shared/` needs a second real usage. One usage stays inline.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
