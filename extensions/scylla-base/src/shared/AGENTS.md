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
  scylla-result.ts                   ScyllaResult<T>, ScyllaError (exported by @scylla/base-sdk),
                                     refusalOf
  account-validation.ts              checkEmail, checkNewPassword, checkPasswordConfirmation,
                                     checkUsername, checkDisplayName (exported by @scylla/base-sdk)
  date-utils.ts, slug.ts, status-config.ts, job-status.utils.ts, toast-messages.ts
infrastructure/grpc/wrappers.ts      proto helpers
presentation/ui/index.ts             `@shared/presentation/ui`
  data-display/                      StatusBar, STATUS_ICONS / getStatusIcon, AgentRunInstructions,
                                     UserIdentity, UserAvatar, userName, userSecondaryLine,
                                     UserIdentityProfile
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

## `UserIdentity`: one way to show a person

`UserIdentity` shows a person everywhere: the user menu, the users list, the member lists, the
grant list, the pages of a user. Initials in the avatar; the display name, else the username;
then the email when it is known, else `@username`. `user={undefined}` is a user that no list
knows any more: it shows "Deleted user", never an id. `missing="unknown"` shows "Unknown user"
instead, for a list that cannot name the user (a grant never outlives its user, so a holder that
the page cannot look up is not deleted). `userName(user)` gives the same first line
as a string, for a sentence or a select. `UserAvatar` is the avatar of `UserIdentity` alone
(`sm`, `default`, `lg` = 72 px), for a layout that puts the name under it (the identity card of
`features/user`). The prop type of both, `UserIdentityProfile`, is structural:
`shared/` cannot import `features/user`, and a `UserSummary` or a `UserEntity` of that module fits
it.

## The account checks

`account-validation.ts` holds the account rules of the backend, checked before a call. Each
check has the shape of `FormItem.validate` (a message descriptor, or `undefined`): the email
format, a new password of 8 to 255 characters (counted in characters, as the backend counts
them) and not spaces only, a confirmation equal to the new password, a username with no '@' and
255 bytes at most, a display name of 100 characters at most. The forms of `login` and `user` use
them, and `@scylla/base-sdk` exports them (`@scylla/base/account-validation`) for the forms of
other extensions: keep their messages, the msgids are shared.

## Rules that bite here

- **`refusalOf(result)`** is for a call whose FAILED_PRECONDITION a page shows itself, beside a
  field: it gives the server message as data (`null` on success) and throws any other error. A
  `mutationFn` that returns it keeps the global toast from showing the same message a second
  time. Use it only when the page shows the message.

- `status-config.ts` / `job-status.utils.ts` are borderline — they encode status *presentation*
  (colour, icon, label), not business rules. Keep it that way; job semantics belong in
  `features/jobs`.
- Adding to `shared/` needs a second real usage. One usage stays inline.
- `StatusBar` puts `data-item-id` on each segment: the onboarding tour points at the last one.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
