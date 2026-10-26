# `features/apps` — agent guide

Machine identities ("apps") and the secrets they authenticate with.

**Layer** `features/` · **id** `apps` · **DI key** `appsRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
type AppEntity, AppSecretEntity
type CreatedApp, CreatedAppSecret, AppAccess, AppAccessScope, ResetAppSecret
type SecretLabelProblem
SECRET_LABEL_MAX_BYTES, normalizeSecretLabel, secretLabelProblem, suggestSecretLabel, trimSecretLabel
appQueries, appMutations
APPS_QUERY_KEY, APP_QUERY_KEY, APP_SECRETS_QUERY_KEY, APP_ACCESS_QUERY_KEY
```

`agents` uses this barrel: an agent is an app. `appQueries.secretsOf` and `appQueries.accessOf`
run on the agent page, outside the pages of this module, thus they check `READ_APP` themselves
(`enabled`). Never add: `apps.module.ts`, pages.

The
factories in `presentation/apps.queries.ts` resolve the repository through
`getModuleDomain('apps')` per call, and a component runs them with `createQuery` /
`createMutation` from `@scylla/core-sdk`.

## Data contract

`AppsRepository` — `domain/repository/apps.repository.ts`:

| Method | Returns |
|---|---|
| `listApps(organizationId)` | `AppEntity[]` |
| `getApp(appId)` | `AppEntity` |
| `createApp(organizationId, name)` | `CreatedApp` (carries the one-time secret) |
| `deleteApp(appId)` | `void` |
| `setAppActive(appId, active)` | `AppEntity` |
| `listAppSecrets(appId)` | `AppSecretEntity[]` |
| `createAppSecret(appId, label)` | `CreatedAppSecret` (one-time value) |
| `revokeAppSecret(secretId)` | `void` |
| `setAppSecretEnabled(secretId, enabled)` | `AppSecretEntity` |
| `setAppSecretLabel(secretId, label)` | `AppSecretEntity`: `SetAppSecretLabel` |
| `listAppAccess(appId)` | `AppAccess[]`: each grant with its scope, names and role |

All wrapped in `ScyllaResult`. Reach it from `apps.queries.ts` only — never from a component.

`ResetAppSecretUseCase` (`domain/use-cases/`, DI key `resetAppSecret`) lists the secrets,
creates a secret with the `label` of the user, then revokes the secrets that existed before it
when `revokeOthers` is true. A failed revoke does not fail the reset: the new secret exists and
shows only in the result (`failed` lists the secrets that stay). `appMutations.resetSecret(appId)`
runs it, with `gcTime: 0`.

## Secret labels

`domain/structs/secret-label.struct.ts` holds the label rules. They are the rules of
`AppSecretLabel` in CE: trimmed, 1 to 64 UTF-8 bytes, no control character, unique in the app.
Dots and upper case are valid.

- `secretLabelProblem(label, taken)` gives the broken rule (`empty`, `tooLong`, `control`,
  `taken`), or `null`.
- `normalizeSecretLabel(raw)` removes the control characters, trims, and cuts to 64 bytes.
- `trimSecretLabel(value)` is the trim of CE (Rust `str::trim`, the Unicode White_Space
  property). JS `trim()` is different: it removes U+FEFF and keeps U+0085. Use
  `trimSecretLabel` for a label that goes to CE.
- `suggestSecretLabel({ preferred, fallback, taken })` is the only place of the default name.
  It normalizes `preferred` (a hostname), else `fallback` (the agent name). While a secret of
  `taken` has the label, it adds `-2`, `-3`, and cuts the base so that the label stays in 64
  bytes.
- `createApp` sends no `secret_label`: CE names the first secret with the app name, cut to 64
  bytes. The proto keeps the field.
- `appMutations.setSecretLabel(appId)` and `appMutations.resetSecret(appId)` give `null` when CE
  says `ALREADY_EXISTS`: the dialog shows the error under the field, and the global toast does
  not show it. They throw all other errors. Both refresh the secrets of the app.

## Layout

```
apps.module.ts                       DI wiring only — no routes, no nav (see below)
index.ts                             public API
domain/
  entities/app.entity.ts             AppEntity, AppSecretEntity, CreatedApp, CreatedAppSecret,
                                     AppAccess, ResetAppSecret
  structs/secret-label.struct.ts     the label rules and suggestSecretLabel (pure)
  repository/apps.repository.ts      the contract
  use-cases/reset-app-secret.use-case.ts   ResetAppSecretUseCase
infrastructure/
  default-apps.repository.ts         AppServiceClient → AppEntity
  grpc-app.mapper.ts                 proto ↔ domain
presentation/
  apps.queries.ts                    every read and write, as query/mutation options
  ui/Apps.page.svelte, AppDetails.page.svelte
  messages/apps.messages.ts                every string — `lingui extract` cannot read `.svelte`
  ui/components/AppCard/             one app in the grid
  ui/AppDetails/                     the details page + AppSecretsCard
  presenters/app-form.presenter.ts, app-secret-form.presenter.ts   the items of the two forms
```

## Routes & nav

**None.** `AppsModule` declares `domain` only. The pages exist and work, but no route mounts
them and no sidebar entry points at them — the feature is complete below the UI and not yet
surfaced.

If you are asked to expose it: add `routes` to `apps.module.ts` (under `organization`, gate on
an apps permission such as `LIST_APPS_BY_ORGANIZATION`, `page`-import the pages lazily, and a
`nav` on the route for the sidebar). Do
**not** register a route anywhere else — the module declaration is the only door.

## Rules that bite here

- **One-time secrets.** `CreatedApp` / `CreatedAppSecret` carry a plaintext value the backend
  will never return again. Render it through `SecretRevealDialog` (`@shared`), never persist it
  in a store, and never log it.
- Enable/disable is `setAppActive` / `setAppSecretEnabled`, distinct from delete/revoke. Keep
  them distinct in the UI too — disabling is reversible, revoking is not.
- **When an app goes, take it out of the cached list and remove its own entries before the
  refetch** (`appMutations.remove`): the app, secrets and access keys. Else a card asks CE about
  an app that no longer exists.
- Invalidate the secrets query after any secret mutation; the app query and the secrets query
  are separate cache entries. `appMutations` already does it — do not re-invalidate at the call
  site.
- **New strings go in `messages/apps.messages.ts`, never inside a `.svelte`.** Extraction does not read
  components, so a message declared there vanishes from the catalogs without failing a gate.
- Both icon-only controls on `AppCard` carry an `sr-only` label (`App actions`, `Delete app`).
  The React original had none, so the only way to reach them in a test was a CSS selector. Keep
  the labels.
- **A bits-ui menu lives in a floating layer**, which floating-ui leaves `visibility: hidden`
  under jsdom: `getByRole('menuitem')` finds nothing. Use `findFloating` from
  `test/render.ts`.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
