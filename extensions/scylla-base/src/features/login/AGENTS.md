# `features/login` — agent guide

Sign-in. Owns the credentials exchange and nothing else.

**Layer** `features/` · **id** `login` · **DI key** `loginRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

**Presentation is Svelte** (Phase 2 of `refacto_svelte.md`). Domain and infrastructure are
unchanged — they never had a framework in them.

## Public API — `index.ts`

```typescript
LoginState, type Credentials
loginPoints, type LoginZoneContext   // extension points — see below
openSession                          // the only writer of the session; a sign-up flow in another extension uses it too
```

Never add: `login.module.ts`, `LoginPage`. There is no `use-login-domain.ts` any more: a view
model calls `getModuleDomain('login')` directly.

## Data contract

`LoginRepository` — `domain/repository/login.repository.ts`:

| Method | Returns |
|---|---|
| `login(username, password)` | `ScyllaResult<void>` |

**`void` is not an oversight.** The session token never travels back through the domain: the
gRPC data source calls `openSession` as a side effect of a successful call. Do not "improve"
this by returning the token — see the rule below before changing anything here.

## Layout

```
login.module.ts                      route + DI wiring (private; registry only)
index.ts                             public API — useLogin only
domain/repository/login.repository.ts
infrastructure/
  repository/data-sources/login-remote.data-source.ts   interface
  data/remote/grpc-login-remote.data-source.ts          impl — calls openSession
  repository/default-login.repository.ts
  session/open-session.ts                               the one writer of token + userId
presentation/
  login.points.ts                    the extension points — see below
  login.state.svelte.ts              the view model: the mutation + the redirect
  ui/Login.page.svelte, LoginForm.svelte
  ui/login.messages.ts               the screen's strings (extraction cannot read `.svelte`)
```

No entities, no structs, no mappers — there is nothing to model.

## Extension points

Full mechanism: `widgets_plan.md` at the repo root; the owner guide is its §6. Defined in
`presentation/login.points.ts`, listed in `LoginModule.points` (that names them `login.*`),
exported from this barrel and from `@scylla/base-sdk`.

| Point | Kind | Context / type | Notes |
|---|---|---|---|
| `login.footer` | zone | `LoginZoneContext` (`{ isPending }`) | Below the card, opened with `use:loginPoints.footer={{ isPending }}`. No default content: a zone that only ever receives `after` components. **No `permission`** — the user has none yet on this page; see the rule below. |
| `login.texts` | text scope | `typeof loginMessages` | `title`, `description`, `identifier`, `identifierPlaceholder`, `password`, `passwordPlaceholder`, `submit`. The page renders them with `t(loginMessages.x)`, as usual: `t` applies the overrides. Render the descriptor of `loginMessages` itself — a copy (`{ ...loginMessages.title }`) is a different object, and an override would not reach it. |
| `login.fields` | value | `readonly FormItem<'identifier' \| 'password'>[]` | The `ScyllaForm` fields of `LoginForm.svelte`. Keep the ids: `submit` reads `values.identifier` and `values.password`. |

- **The field id is `identifier`, not `username`.** The backend's `LoginRequest.identifier`
  accepts a username or an email already; an extension that wants an email field does it with a
  patch on `login.fields`, not a new field.
- **No `login.form` zone yet.** It would wrap the whole credentials form (for a `replace`, e.g.
  a different sign-in method entirely) — add it when a real consumer
  needs it, not before.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `public` | `login` | none | `Login.page.svelte` |

The `public` mount puts it **outside** `AuthGuard`. It must stay there: mounting it anywhere else
makes signing in require being signed in.

No nav entry — the sidebar only renders inside the authenticated shell.

## Rules that bite here

- **Session storage is `localStorage`, keys `token` and `userId`, written only by
  `infrastructure/session/open-session.ts`.** Three places must agree: `openSession` writes
  them, `platform/grpc`'s transport reads `token` for the `Authorization: Bearer` header, and
  `shell/.../Auth.guard.svelte` reads it to decide whether to redirect. Changing the key or the
  mechanism means changing all three in the same commit. **A sign-up flow (in another extension)
  opens a session the same way — through `openSession`, never a direct `localStorage.setItem`.**
- **`LoginState` must be constructed during a component's initialisation.** The mutation inside
  it installs an `$effect.pre`; built from an event handler, Svelte throws `effect_orphan`. True
  of every view model holding a query or a mutation.
- No permission gate anywhere in this module — the user has none yet. Permissions are loaded
  *after* sign-in by `syncMyPermissions` in [`roles`](../roles/AGENTS.md), which the shell calls.
  **The same reason bars `permission` on a `login.footer` injection** (`can` has nothing to
  check pre-sign-in; see "Extension points" above) — a contributor that sets one gets a
  component that silently never renders, not an error.
- After a successful login the app must land somewhere the user can actually reach; that
  redirect is the shell's job, not this module's.
- Never log, toast or store the password. Errors surface as a generic failure — do not leak
  whether the username exists.
- **The data source re-codes `UNAUTHENTICATED` to `INVALID_CREDENTIALS`** (via `mapError`). On
  every other call that code means "session expired", and the shell's `reportQueryError`
  handler reacts to it by clearing the token and hard-loading `/login` — from the login page
  that is a silent reload that eats the error. Remove the translation and a wrong password
  reloads the page instead of showing a message.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
