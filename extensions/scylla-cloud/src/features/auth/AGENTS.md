# `features/auth` — agent guide

Self-service sign-up, and the two widget injections that make the login page fit a cloud
account. v1 scope: `scylla-cloud-v1_plan.md` at the repo root.

**Layer** `features/` · **id** `cloud-auth` · **DI key** `registrationRepository`

## Import rules

- May import: `@scylla/base-sdk`, `@scylla/core-sdk`, `@scylla/ui`. **Never `@scylla/base`
  directly, never another extension's internals.**
- Relative imports only — `scylla-cloud` has one feature, no `@base/*`-style alias.
- Outside code reaches this module only through `index.ts` — which exports nothing yet (below).

## Public API — `index.ts`

```typescript
// nothing yet
```

No other module in this extension consumes `auth`. The barrel exists anyway, per `CLAUDE.md`:
"every feature has one, even when nothing consumes it yet." It is a declared orphan in
`.dependency-cruiser.cjs` (`no-orphans`'s `pathNot`) for the same reason — see the comment there
before assuming a feature barrel with no importer is dead code.

## Data contract

`RegistrationRepository` — `domain/repository/registration.repository.ts`:

| Method | Returns |
|---|---|
| `signup(input: SignupInput)` | `ScyllaResult<void>` |

`SignupInput { username, email, password, organizationName }`.

**`void` is not an oversight** — same rule as `scylla-base`'s `login`. The session token never
travels back through the domain: the gRPC data source calls `openSession` (from
`@scylla/base-sdk`) as a side effect of a successful call.

## Layout

```
auth.module.ts                      route + DI wiring (private; registry only)
index.ts                            public API — empty for now
domain/repository/registration.repository.ts
infrastructure/
  repository/data-sources/registration-remote.data-source.ts   interface
  data/remote/grpc-registration-remote.data-source.ts           impl — calls openSession
  repository/default-registration.repository.ts
presentation/
  registration.queries.ts           registrationMutations.signup
  register-page.state.svelte.ts     the view model: the mutation + the redirect
  ui/Register/Register.page.svelte, RegisterForm/RegisterForm.svelte, register.messages.ts
widget-injections/
  email-login/        EmailLoginWidgetInjection — texts + a patch on scylla-base's `login.*`
  sign-up-link/        SignUpLinkWidgetInjection — a component in `login.footer`
```

No entities, no structs, no mappers — same reasoning as `login`: a signup request is four
strings and the response is a token that never becomes a domain object.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `public` | `register` | none | `Register.page.svelte` |

The `public` mount puts it outside `AuthGuard`, next to `/login` — signing up must not require
being signed in. No nav entry: the sidebar only renders inside the authenticated shell.

## Widget injections

Full mechanism: `widgets_plan.md` at the repo root. Both injections live here, not in a
top-level `widget-injections/`, because they only make sense as part of how this feature makes
`scylla-base`'s login usable for a cloud account.

| Injection | Changes | Why it is its own injection |
|---|---|---|
| `EmailLoginWidgetInjection` | `login.texts` (override `identifier`, `identifierPlaceholder`, `description`), `login.fields` (patch the identifier field to `inputType: 'email'`) | The words and the field type must change together — an "Email" label on a `text` field, or an `email` field still labelled "Username", is wrong either way. |
| `SignUpLinkWidgetInjection` | `login.footer` (a component) | Independent of the email change: removing one must not affect the other. |

- **Words go through `login.texts`, structure goes through `login.fields`.** A patch never
  calls `t()` or sets a label — the owner (`scylla-base`'s `LoginForm`) builds its fields with
  `t(loginMessages.x)`, and `t` applies the text override, so it already reaches the label.
- **The override's `msg` are written in the injection file.** It is a `.ts`, so `lingui extract`
  reads it: no `*.messages.ts` for an injection. Only an injected `.svelte` component
  (`SignUpLink`) keeps one.
- **Neither injection declares a `permission`.** The user has none on the login page — see
  `scylla-base`'s login `AGENTS.md`, "Extension points".
- **`loginPoints` comes from `@scylla/base-sdk`, never a string.** `import { loginPoints } from '@scylla/base-sdk'`, then `loginPoints.footer.inject({...})` — there is no point name to type by
  hand, and the import is what the loader's dependency check actually verifies.

## Rules that bite here

- **`RegisterPageState` must be constructed during a component's initialisation** — the mutation
  installs an `$effect.pre`; built from an event handler, Svelte throws `effect_orphan`.
- **The form checks the server's own rules before the call** (password 8–255 characters, no
  empty field) with `FormItem.pattern`; the server remains the real check.
- **No `onError` in the mutation** — the global handler of `scylla-base`'s shell shows the
  error. `GrpcRegistrationRemoteDataSource` turns `ALREADY_EXISTS`, `INVALID_ARGUMENT` and
  `UNIMPLEMENTED` into a message the page can show as-is; it keeps the original `cause` (unlike
  `login`'s `UNAUTHENTICATED` re-code), since nothing else in the app gives these three codes a
  competing meaning.
- Never log, toast or store the password.
- **The sign-up link always shows** (`scylla-cloud-v1_plan.md` §1.2, §6 question 1): there is no
  capability check against the server yet. A server built without the `register` feature answers
  `UNIMPLEMENTED` only once the user actually submits the form.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean. New strings: `pnpm extract && pnpm compile`.
