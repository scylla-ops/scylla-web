# `shared` (scylla-base) — agent guide

The code that two or more Scylla features share **and that has a business meaning**, so it
cannot go to `@scylla/ui`.

**Folder** `extensions/scylla-base/src/shared/` · alias `@shared/*` (scylla-base only)

## Import rules

- **`shared/` MUST NOT import `features/`, `shell/` or `platform/`** (`shared-is-generic`, error).
  It may import `@scylla/ui` and `@scylla/core-sdk`.
- The features of scylla-base import it by path (`@shared/utils/scylla-error.ts`). No other
  extension does: `ScyllaError` reaches them through `@scylla/base-sdk`.
- Generic UI does not go here. Could it live in another product, unchanged? Then it goes to
  [`@scylla/ui`](../../../../packages/ui/AGENTS.md).

## Structure

```
utils/
  scylla-error.ts                    ScyllaError, ScyllaErrorCode, refusalOf
                                     (exported by @scylla/base-sdk)
  account-validation.ts              checkEmail, checkNewPassword, checkPasswordConfirmation,
                                     checkUsername, checkDisplayName (exported by @scylla/base-sdk)
  date-utils.ts, slug.ts, status-config.ts, job-status.utils.ts, toast-messages.ts
domain/structs/job-status.struct.ts  JobStatus, isActiveStatus, isFinishedStatus: the status of a
                                     job, which `jobs` and `agents` both read (`jobs` re-exports it)
domain/structs/api-token.struct.ts   ApiToken, TokenLimits, TokenPreset, TokenExpiry, expiryStateOf:
                                     the API tokens of the apps and the personal tokens
infrastructure/grpc/wrappers.ts      proto helpers, and `required`: the entity a response must carry
                                     (MALFORMED_RESPONSE when the server left it out)
infrastructure/grpc/api-token.mapper.ts  apiTokenToDomain, limitsToProto, expiryToProto
presentation/ui/index.ts             `@shared/presentation/ui`
  data-display/                      StatusBar, STATUS_ICONS / getStatusIcon,
                                     Identity, IdentityAvatar, identityKindOf, userName,
                                     userSecondaryLine, IdentityKind, UserIdentityProfile,
                                     ProviderMark
presentation/ui/layout/AuthLayout.svelte  the frame of the public pages; import it by path
locales/                             the catalog of these files
```

## `ScyllaError` — the error contract

A repository method returns `Promise<T>` and rejects with a `ScyllaError`. The transport of
[`platform/grpc`](../platform/grpc/AGENTS.md) makes every failed gRPC call into one: a repository
only awaits the call. There is no Result type.

```typescript
queryFn: () => repository().listByProjectId(projectId),        // no catch, no unwrap

try {                                                           // a caller that branches
  await repository().setAppSecretLabel(id, label);
} catch (error) {
  if (ScyllaError.from(error).isAlreadyExists()) return null;
  throw error;
}
```

- `new ScyllaError(message, { code, cause })`. `code` is a `ScyllaErrorCode`, not a `string`:
  the gRPC-Web status names (derived from `GrpcStatusCode`, imported as a type only — nothing
  lands in the bundle) plus the codes we mint. A code compared anywhere must exist in that
  union, so add yours there first. With no `code`, it is `UNKNOWN_ERROR`.
- `ScyllaError.from(value)` reads any thrown value: a `ScyllaError` stays as it is, an error with
  a gRPC `code` string keeps it, anything else (a bug, a `TypeError`) is `UNKNOWN_ERROR`. Use it
  in a `catch`, where the value is `unknown`.
- `userMessage()` gives a message of this app as it is, whatever its code. A **raw** message
  (`raw: true`: the text of the server, set by the transport, or of an exception, set by
  `from`) shows only for the codes that the user can act on (`USER_FACING_CODES`). For
  `UNAVAILABLE`, `PERMISSION_DENIED` and every other raw message, it gives a fixed text: a
  server fault or a bug never shows its text. For `ABORTED` (a conflict), it gives the sentence
  of the app: someone else changed the item, and the page shows the latest version.
- **A `new ScyllaError` is a message for the user**: write it with `` t`…` ``. A broken contract
  of the server (an answer without its entity) is a bug: throw a plain `Error`, and the user
  sees the generic message.
- `log()` writes a server fault or a bug (`INTERNAL`, `UNKNOWN_ERROR`, …) with `console.error`,
  in production too: it is what a user can send to the support. A refusal of the server
  (`EXPECTED_CODES`: the user-facing and transient codes, `ABORTED`, `PERMISSION_DENIED`,
  `UNAUTHENTICATED`, `CANCELLED`) is a normal answer: it is written in development only. The line
  names the call (`rpc`, set by the transport): `[ScyllaError] NOT_FOUND
  scylla.secret.v1.SecretService/ListSecrets: no such secret`. Do not write a message of your own
  for the log: the name of the call is exact for every call.
- `isTransient()` is true for `UNAVAILABLE`, `DEADLINE_EXCEEDED`. `retryQueryError` retries only
  these.
- `isConflict()` is true for `ABORTED`: the server refused a write because the item changed
  since it was read. It is not transient: the same write fails again until the item is read
  again. The protos do not carry the version, so a page cannot send one: `reportQueryError`
  tells the conflict and invalidates every query, and the page shows the latest version.
- When a generic code means something more precise for one call, catch it in the repository,
  and throw a new `ScyllaError` (see [`login`](../features/login/AGENTS.md):
  `UNAUTHENTICATED` → `INVALID_CREDENTIALS`), rather than special-casing it in every consumer.
- `refusalOf(call)` gives the message of a `FAILED_PRECONDITION` and throws any other error:
  for a page that shows the refusal beside a field.
- **Do not add an `onError` toast to a query or a mutation.** `reportQueryError`
  (`shell/presentation/report-query-error.ts`, the `onQueryError` of `ShellModule`) already
  toasts every error, and you would double it.

## `Identity`: one way to show a person, an agent or an app

`Identity` shows an actor everywhere: the users list, the member lists, the holders of a role,
the pages of a user. The `kind` (`IdentityKind`) shows in the avatar, so the reader sees who it
is before the name:

| `kind` | Avatar | Second line (`row`) or label (`cell`) |
|---|---|---|
| `person` (the default) | circle, initials, primary tint | the email, else `@username` |
| `person` with `self` | solid primary circle, and a "You" badge | the email, else `@username` |
| `agent` | rounded square, bot icon, info tint | "Agent" |
| `app` | rounded square, blocks icon, border | "App" |
| `profile={undefined}` | dashed circle with "?" | none |

`identityKindOf({ actorKind, runner })` gives the kind from the server: `user` is a person, an
App with `runner` is an agent, and another App is an app. The name is the display name, else the
username. `profile={undefined}` is an actor that no list knows any more: it shows "Deleted user",
never an id. `missing="unknown"` shows "Unknown user" instead, for a list that cannot name the
user (a grant never outlives its user, so a holder that the page cannot look up is not deleted).
`userName(user)` gives the same name as a string, for a sentence or a select.

| `format` | Avatar | For |
|---|---|---|
| `mention` | 16 px | A name in a sentence. The reader is "You". |
| `chip` | 16 px, in a pill | A picked actor in a field. With `onRemove`, an "x" button named "Remove <name>". The reader is "You". |
| `cell` | 24 px | One line: a short list (the holders of a role) or an option of a picker. |
| `row` (the default) | 32 px | Two lines, for a table. |
| `header` | 48 px | The `h1` of a detail page, with a badge: "You", the kind of a machine, else `@username`. The email of a person under it. |

`IdentityAvatar` is the avatar alone, at 16 (one letter), 24 (a stack of avatars), 32, 48 or
72 px (a card). `online` puts a dot on an agent. The prop type, `UserIdentityProfile`, is structural: `shared/` cannot import
`features/user`, and a `UserSummary` or a `UserEntity` of that module fits it. An app gives its
name as `displayName` and an empty `username`.

## The account checks

`account-validation.ts` holds the account rules of the backend, checked before a call. Each
check has the shape of `FormItem.validate` (a message descriptor, or `undefined`): the email
format, a new password of 8 to 255 characters (counted in characters, as the backend counts
them) and not spaces only, a confirmation equal to the new password, a username with no '@' and
255 bytes at most, a display name of 100 characters at most. The forms of `login` and `user` use
them, and `@scylla/base-sdk` exports them (`@scylla/base/account-validation`) for the forms of
other extensions: keep their messages, the msgids are shared.

## The token form

`CopyBox` (`presentation/ui/data-display/`) shows a value to copy, also a secret that the user can
reveal. `presenters/token-labels.presenter.ts` gives the words of the limits and of the expiry of a
token; the apps and the personal tokens use it.

`TokenForm` (`presentation/ui/forms/`) is the form of a new API token: the name, the life (7, 30,
90 or 365 days), the limits (a preset, or the boxes of `token-actions.struct.ts`: a changed box
gives the preset `custom` with the methods of the checked boxes) and the projects. The caller
gives the projects and the hint, because `shared/` cannot read the projects. The app tokens use
it, and the personal tokens must use it too. When the server gets a new method, add it to its
box in `ACTION_GROUPS`.

## The frame of the public pages

`AuthLayout` (`presentation/ui/layout/`) has a panel with the mark at `lg` and up, then a centered
column with the logo, the title, the optional description, the content and a `below` snippet. The
pages of `login` and the page of an invitation use it.

Import it by path. Do not add it to `@shared/presentation/ui`: that barrel holds `CopyBox`,
`StatusBar` and `TokenForm`, and a public page would load them in its chunk.

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
