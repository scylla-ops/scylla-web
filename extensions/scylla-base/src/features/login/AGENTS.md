# `features/login` — agent guide

Sign-in, sign-out and the password reset by link. Owns the session and the public pages that
come before it.

**Layer** `features/` · **id** `login` · **DI key** `loginRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

**Presentation is Svelte** (Phase 2 of `refacto_svelte.md`). Domain and infrastructure never had
a framework in them.

## Public API — `index.ts`

```typescript
LoginState, type Credentials         // Credentials = { identifier, password }
loginPoints, type LoginZoneContext   // extension points — see below
openSession, closeSession            // the only writers of the session; a sign-up flow in another extension uses openSession too
hasSession                           // is a token stored? the auth guard and other extensions read it, never localStorage
signOut                              // closeSession + context reset + a full load of /login
type PasswordResetDelivery           // 'mail' | 'server-log' | 'unknown'; `user` uses it too
```

Never add: `login.module.ts`, a page. There is no `use-login-domain.ts`: a view model calls
`getModuleDomain('login')` directly.

## Data contract

`LoginRepository` — `domain/repository/login.repository.ts`:

| Method | Returns |
|---|---|
| `login(identifier, password)` | `ScyllaResult<void>` |
| `requestPasswordReset(email)` | `ScyllaResult<PasswordResetDelivery>` |
| `resetPassword(token, newPassword)` | `ScyllaResult<void>` |

**`void` on `login` is not an oversight.** The session token never travels back through the
domain: the gRPC data source calls `openSession` as a side effect of a successful call. Do not
"improve" this by returning the token: read the rule below before changing anything here.

`identifier` is the name of the value at every layer, from the form field to the request: an
email when it holds '@', else a username.

## Layout

```
login.module.ts                      routes + DI wiring (private; registry only)
index.ts                             public API
domain/
  repository/login.repository.ts
  structs/password-reset.struct.ts   PasswordResetDelivery
infrastructure/
  repository/data-sources/login-remote.data-source.ts   interface
  data/remote/grpc-login-remote.data-source.ts          impl — calls openSession
  repository/default-login.repository.ts
  repository/mappers/grpc-password-reset.mapper.ts      proto enum → PasswordResetDelivery
  session/session.ts                                    openSession, closeSession (the writers of token + userId), hasSession
presentation/
  login.points.ts                    the extension points — see below
  login.state.svelte.ts              sign-in: the mutation + the redirect
  forgot-password.state.svelte.ts    the request of a reset link
  reset-password.state.svelte.ts     the token of the link, the new password
  sign-out.ts                        signOut
  ui/AuthLayout.svelte               the frame of the public pages: logo, card, a `below` snippet
  ui/Login/Login.page.svelte, ui/LoginForm/LoginForm.svelte
  ui/ForgotPassword/ForgotPassword.page.svelte
  ui/ResetPassword/ResetPassword.page.svelte
  ui/login.messages.ts               the sign-in strings (the `login.texts` point)
  ui/password-reset.messages.ts      the strings of the two reset pages
```

## Extension points

Full mechanism: `widgets_plan.md` at the repo root; the owner guide is its §6. Defined in
`presentation/login.points.ts`, listed in `LoginModule.points` (that names them `login.*`),
exported from this barrel and from `@scylla/base-sdk`.

| Point | Kind | Context / type | Notes |
|---|---|---|---|
| `login.footer` | zone | `LoginZoneContext` (`{ isPending }`) | Below the card, opened with `use:loginPoints.footer={{ isPending }}`. No default content: a zone that only ever receives `after` components. **No `permission`** — the user has none yet on this page; see the rule below. |
| `login.texts` | text scope | `typeof loginMessages` | `title`, `description`, `identifier`, `identifierPlaceholder`, `password`, `passwordPlaceholder`, `submit`, `forgotPassword`. The page renders them with `t(loginMessages.x)`, as usual: `t` applies the overrides. Render the descriptor of `loginMessages` itself: a copy (`{ ...loginMessages.title }`) is a different object, and an override would not reach it. |
| `login.fields` | value | `readonly FormItem<'identifier' \| 'password'>[]` | The `ScyllaForm` fields of `LoginForm.svelte`. Keep the ids: `submit` reads `values.identifier` and `values.password`. |

- **The field id is `identifier`, not `username`.** The backend's `LoginRequest.identifier`
  accepts a username or an email; an extension that wants an email field does it with a patch on
  `login.fields`, not a new field.
- **Override the label, the placeholder and the description together.** The default texts say
  "Email or username" in three places. An override of `identifier` alone leaves a description
  that names a username the field no longer takes.
- **The "Forgot password?" link is CE content**, in the footer snippet of `LoginForm`, right under
  the password field. It is not in the `login.footer` zone, which stays empty for the extensions.
- **No `login.form` zone yet.** It would wrap the whole credentials form (for a `replace`, e.g.
  a different sign-in method entirely). Add it when a real consumer needs it, not before.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `public` | `login` | none | `Login.page.svelte` |
| `public` | `forgot-password` | none | `ForgotPassword.page.svelte` |
| `public` | `reset-password` | none | `ResetPassword.page.svelte` |

The `public` mount puts them **outside** `AuthGuard`. They must stay there: mounting them
anywhere else makes signing in, or resetting a password, require being signed in.

`reset-password` is the path of the link that the server makes
(`AuthService.RequestPasswordReset`). Do not rename it.

No nav entry — the sidebar only renders inside the authenticated shell.

## The password reset

- `forgot-password` calls `RequestPasswordReset`. The answer is the same whether an account uses
  the email or not; the page tells only how the server delivers the link (`delivery`): by mail,
  or in the server log for an administrator.
- `reset-password` reads the token from the URL fragment (`#token=…`) when the view model is
  built, and again on `hashchange` (`readNewLink`): a second link opened in the same tab changes
  only the fragment, with no page load. Each time it removes the fragment with
  `history.replaceState` and starts again from an empty form. The token never reaches the
  server in a request line, and it does not stay in the address bar or the history.
- FAILED_PRECONDITION of `ResetPassword` (unknown, used or expired link, inactive account) is a
  state of the page, not an error: `refusalOf` (`@shared/utils/scylla-result.ts`) gives it back as
  data, so the global handler does not toast it too. A link with no token shows the same state.
- The new password is checked in the app first (`@shared/utils/account-validation.ts`): 8 to 255
  characters, and a confirmation equal to it.

## Rules that bite here

- **Session storage is `localStorage`, keys `token` and `userId`, written only by
  `infrastructure/session/session.ts`.** Three places must agree: `openSession` writes them,
  `platform/grpc`'s transport reads `token` for the `Authorization: Bearer` header, and
  `shell/.../Auth.guard.svelte` reads it (through `hasSession`) to decide whether to redirect. Changing the key or the
  mechanism means changing all three in the same commit. **A sign-up flow (in another extension)
  opens a session the same way — through `openSession`, never a direct `localStorage.setItem`.**
  Signing out goes through `closeSession` (both keys) or `signOut`.
- **A view model of this module must be constructed during a component's initialisation.** The
  mutation inside it installs an `$effect.pre`; built from an event handler, Svelte throws
  `effect_orphan`. True of every view model holding a query or a mutation.
- No permission gate anywhere in this module — the user has none yet. Permissions are loaded
  *after* sign-in by `syncMyPermissions` in [`roles`](../roles/AGENTS.md), which the shell calls.
  **The same reason bars `permission` on a `login.footer` injection** (`can` has nothing to
  check pre-sign-in; see "Extension points" above) — a contributor that sets one gets a
  component that silently never renders, not an error.
- After a successful login the app must land somewhere the user can actually reach; that
  redirect is the shell's job, not this module's.
- Never log, toast or store a password. Errors surface as a generic failure: do not leak
  whether the account exists.
- **The data source re-codes `UNAUTHENTICATED` to `INVALID_CREDENTIALS`** (via `mapError`). On
  every other call that code means "session expired", and the shell's `reportQueryError`
  handler reacts to it by clearing the session and hard-loading `/login`. From the login page
  that is a silent reload that eats the error. Remove the translation and a wrong password
  reloads the page instead of showing a message.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
