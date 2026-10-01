# Plan — scylla-cloud v1

Status: **implemented**, on branch `feat/widget-injections`. Not committed or merged — per the
user's standing instruction, commits and pushes happen only when asked.

This plan does two things:

1. It implements the widget system of [`widgets_plan.md`](widgets_plan.md) — only the part that
   v1 needs.
2. It creates the `scylla-cloud` extension, with one module: `auth`. The module adds a register
   page, and it changes the login page of `scylla-base` with two widget injections.

`widgets_plan.md` stays the design. This plan gives the order of the work, the files, and the
decisions that v1 adds. `CLAUDE.md` stays the contract for everything.

---

## 1. The scope

### 1.1 In v1

| What the user sees | How |
|---|---|
| On the login page, the identifier field becomes an email field: its label, its placeholder and the description say "Email", and its input type is `email`. | Widget injection `EmailLoginWidgetInjection`: a text override on `loginPoints.texts` and a patch on `loginPoints.fields`. |
| On the login page, a "Don't have an account? Sign up" link below the card. | Widget injection `SignUpLinkWidgetInjection`: a component in the zone `loginPoints.footer`. |
| A `/register` page: username, email, password, organization name. A successful sign-up opens a session and goes to `/`. | Module `CloudAuthModule`: a route on the `public` mount, a domain, a gRPC data source. |

### 1.2 Not in v1

- GitHub or another OAuth provider.
- The `form` zone of the login page. v1 opens only the points that v1 uses.
- Email verification, terms of service, password reset, billing.
- A capability check against the server: the sign-up link always shows (§6, question 1).

---

## 2. The decisions that v1 adds

### 2.1 The three kinds of points

v1 implements the three kinds of `widgets_plan.md`: **zone**, **text scope** and **value**. Each
has a consumer in v1:

| Kind | Consumer in v1 |
|---|---|
| zone | the sign-up link, in `loginPoints.footer` |
| text scope | "Email" in place of "Username", in `loginPoints.texts` |
| value | the identifier field becomes an `email` field, in `loginPoints.fields` |

**Words go through the text scope, structure goes through the value.** The email change needs
both, in one injection:

- The label, the placeholder and the description are messages. The injection overrides them in
  `loginPoints.texts`. They stay `msg` descriptors, so they stay in the catalogs and follow a
  change of language.
- The input type is structure. The injection patches the `FormItem` in `loginPoints.fields`.

A patch never calls `t()` and never sets a label: the owner builds the fields with the messages
of its text scope, so the text override already reaches the label. This split keeps each change
in the place that is made for it.

The consequence: the field accepts an email only. The backend still accepts a username
(`LoginRequest.identifier`: "Email when the value contains '@', otherwise a username"), but a
cloud user signs in with their email. That is the intention of `scylla-cloud`.

### 2.2 The login page opens three points

```typescript
export const loginPoints = definePoints('login', {
  /**
   * Below the card. Receives components; there is no default content.
   * No `permission`: the user has none yet on this page (`widgets_plan.md` §14, question 3).
   */
  footer: point.zone<LoginZoneContext>(),
  /** The title, the description and the labels of the login page. */
  texts: point.texts(loginMessages),
  /**
   * The fields of the credentials form, built with the messages of `texts`.
   * Keep the ids: the submit reads `identifier` and `password`.
   */
  fields: point.value<readonly FormItem<'identifier' | 'password'>[]>(),
});
```

**The field id becomes `identifier` before it is public.** Today `LoginForm` names it
`username`. Once `loginPoints.fields` exports it, the id is public API, and "username" would be
wrong for a field that holds an email. The backend already calls it `identifier`. The messages
keys follow (`identifier`, `identifierPlaceholder`); their English text ("Username") does not
change, so no translation is lost.

The `form` zone comes when an extension needs it. Each point is an API that `scylla-base` must
keep (`widgets_plan.md` §6.3).

### 2.3 An injection lives in the feature that it serves

The two injections serve the `auth` feature: the sign-up link goes to the register page of
`auth`, and the email texts are part of how `scylla-cloud` signs in. So they go **in the
feature**, not in a separate top-level folder:

```
features/auth/
├── auth.module.ts
├── index.ts
├── widget-injections/
│   ├── email-login/email-login.widget-injection.ts
│   └── sign-up-link/sign-up-link.widget-injection.ts
└── …
```

The rules:

- An injection that serves a feature lives in `features/<feature>/widget-injections/`. It may
  use the internals of its feature (a message, a component, a route path), like the rest of the
  feature.
- An injection that serves no feature lives in the top-level `src/widget-injections/`.
- A `*.widget-injection.ts` is **private, like a `*.module.ts`**. Only the extension file
  (`scylla-cloud.extension.ts`) imports it, by path. The barrel never exports it: an injection
  points to components, and a barrel must not pull components into other chunks.

`widgets_plan.md` §4.1 is updated with these rules.

### 2.4 One session, opened in one place

Today `GrpcLoginRemoteDataSource` writes `token` and `userId` into `localStorage`. The gRPC
transport and `Auth.guard.svelte` read them. The three must agree (login `AGENTS.md`).

`Signup` also returns a `token` and a `userId`. `scylla-cloud` must open the same session, but it
must not write to `localStorage` itself: the storage contract must stay in one place.

So `scylla-base` exports `openSession(token, userId)` from the login barrel, and its own data
source uses it too. `scylla-cloud` gets it from `@scylla/base-sdk`. This answers question 1 of
`widgets_plan.md` §14.

### 2.5 Each extension generates the protos that it uses

`scripts/gen-proto.mjs` writes every client into `extensions/scylla-base/src/generated/`.
`scylla-cloud` cannot import it (`sdk-is-the-door`), and exporting generated clients from the
SDK would make them public API.

So the script gets one entry per extension, with the proto packages that it uses:

```javascript
const targets = [
  { extension: 'scylla-base', protos: ['scylla'] }, // all, as today
  { extension: 'scylla-cloud', protos: ['scylla/registration/v1', 'scylla/common/v1'] },
];
```

Each target is generated into `extensions/<extension>/src/generated/`. `common` is generated twice.
That is correct: the two copies are private, and each extension maps them to its own domain types.

A shared `@scylla/protos` package is the alternative. It is a larger change (every import of
`scylla-base` moves), and v1 does not need it.

### 2.6 Imports inside scylla-cloud

`@base/*`, `@platform/*` and `@shared/*` are for `scylla-base` only. `scylla-cloud` uses
**relative imports**, like `@scylla/ui` and the SDKs. It has one feature: an alias is not
necessary yet.

---

## 3. What the backend gives

| RPC | Request | Response | Notes |
|---|---|---|---|
| `AuthService.Login` | `identifier` (username or email), `password` | `token`, `userId` | Used by `scylla-base`. No change. |
| `RegistrationService.Signup` | `username` (1–255 bytes, unique), `password` (8–255 chars), `email` (unique), `organization_name` (1–255 bytes) | `token` (24 h), `userId`, `organizationId` | One transaction: user + organization + `organization-admin` role. |

`Signup` errors that the page must show with a clear message:

| Code | Meaning | Message |
|---|---|---|
| `ALREADY_EXISTS` | The username or the email is used. Also a retry after an `INTERNAL` that committed. | "This username or email is already used." |
| `INVALID_ARGUMENT` | A field breaks a server rule. | The server message, or a generic "Check the fields." |
| `UNIMPLEMENTED` | The server is not built with the `register` feature. | "Sign-up is not available on this server." |

---

## 4. The phases

Two pull requests:

- **PR 1 — the widget system** (phases 1 to 3). It changes `core-sdk`, `core` and `scylla-base`.
  With no injection, the app is unchanged.
- **PR 2 — scylla-cloud v1** (phases 4 to 7).

Each phase ends with the six gates clean: `pnpm typecheck`, `pnpm test`, `pnpm lint`,
`pnpm depcruise`, `pnpm depcruise:cycles`, `pnpm i18n:collisions`. `pnpm coverage` passes at
the end of each PR.

### Phase 1 — The widget system in `core-sdk` and `core` — **done**

`sdks/core-sdk/src/widgets/`:

| File | Content |
|---|---|
| `widget-points.struct.ts` | `ZonePoint`, `TextsPoint`, `ValuePoint`, `ZoneComponentOptions`, `ZonePosition`, `WidgetChange`, `ZoneBinding` |
| `define-points.ts` | `definePoints`, `point.zone`, `point.texts`, `point.value`. Rejects a scope defined twice. |
| `widget-injection.struct.ts` | `WidgetInjection` |
| `widget-injection-registry.ts` | `WidgetInjectionRegistry`, `setWidgetInjectionRegistry`, the readers that the points use |
| `widget-zone.calculator.ts` | `resolveZone`: `when`, `permission`, `order`, positions |
| `widget-zone.actions.svelte.ts` | `widgetZone` |
| `install-widget-injections-for-test.ts` | `installWidgetInjectionsForTest` (`widgets_plan.md` §4.2) — the permissive installer a community extension uses to test its own injections outside this monorepo |
| `WidgetInjectionHost.svelte` | the boundary, the lazy import of one injected component, and its own `<style>` carrying the global `replace` CSS rule (not exported — see `widgets_plan.md` §8.2) |

- `ExtensionManifest.widgetInjections` in `extension.decorator.ts`. `ScyllaModule` does not
  change.
- The `core-sdk` barrel exports: `definePoints`, `point`, `widgetZone`, the types,
  `setWidgetInjectionRegistry`.

`packages/core`:

- `loader/merge-widget-injections.ts`: the checks of `widgets_plan.md` §8.1 — unique ids, known
  scope, owner in `dependencies`, one `replace` per zone, one override per message — and the
  sort. A pure function, so `test/` can use it.
- `loadExtensions` adds `widgetInjections` to `LoadedApp`. `startCore` installs it next to
  `setDependencyRegistry`.

`test/render.svelte.ts`: `withWidgetInjections(...injections)`, built on
`merge-widget-injections.ts`.

Tests (`widgets_plan.md` §10): `definePoints`, `resolveZone`, `widgetZone` (positions, context
update with no remount, `when`, failed import, failed render, no flash, nothing left after
`destroy`), `TextsPoint.messages`, `ValuePoint.resolve` (order of the patches, a patch that
throws is skipped), and each error of the loader.

Docs: `core-sdk` `AGENTS.md` + `README.md` (a section "Widgets and widget injections"), `core`
`AGENTS.md` (the new checks).

**Done when** a fake extension in a test injects a component, overrides a text and patches a
value, and each loader error fails with a message that names the injections and their
extensions. **Met.**

### Phase 2 — `openSession` in `scylla-base` — **done**

- `features/login/infrastructure/session/open-session.ts`: `openSession(token, userId)`, writing
  the two `localStorage` keys. `GrpcLoginRemoteDataSource` calls it in place of its two
  `setItem`.
- The login barrel exports `openSession`. `@scylla/base-sdk` re-exports it with no change.
- A test: `openSession` writes the keys that the transport and `Auth.guard.svelte` read.
- Login `AGENTS.md`: the session rule names `openSession` as the only writer.

### Phase 3 — The login points in `scylla-base` — **done**

- `features/login/presentation/login.points.ts`: `loginPoints` (`footer`, `texts`, `fields`)
  and `LoginZoneContext` (§2.2).
- The field id `username` becomes `identifier` in `LoginForm.svelte`, and the message keys
  `username` / `usernamePlaceholder` become `identifier` / `identifierPlaceholder`. Confirmed
  with `pnpm extract`: only the `.po` files' line-number comments moved, no msgid changed, no
  French translation lost.
- `Login.page.svelte`: the texts come from `loginPoints.texts.messages`, and a
  `<div use:widgetZone={loginPoints.footer.with({ isPending: state.isPending })}></div>` below
  the card.
- `LoginForm.svelte`: it builds its fields with the messages of `loginPoints.texts.messages`,
  then passes them through `loginPoints.fields.resolve(...)`.
- The login barrel exports `loginPoints` and `LoginZoneContext`.
- Tests: `Login.page.test.ts` and `LoginForm.test.ts` (existing) pass unchanged — same rendered
  labels. New `Login.widget-injections.test.ts`: the overridden label/placeholder show, the
  patched field has `type="email"`, the injected footer component renders, and the page with no
  injection still renders exactly as before.
- Login `AGENTS.md`: a section "Extension points". `@scylla/base-sdk` `AGENTS.md`: a table of
  points, checked by `sdks/scylla-base-sdk/src/__test__/points-documented.test.ts`.
- Still open: checking how `ScyllaForm` computes `isValid` for an `email` input is deferred to
  phase 6, which is the first consumer of that input type.

**Done when** PR 1 is merged: the app is unchanged, and the login page has three points. **Met**
— all six gates pass (one pre-existing, unrelated failure in `AgentOutcomesChart.test.ts`,
confirmed present before this work too).

### Phase 4 — The `scylla-cloud` package — **done**

Follow the checklist "Adding an extension" of `CLAUDE.md`:

```
extensions/scylla-cloud/
├── package.json            "@scylla/cloud", exports "." → ./src/index.ts
│                           dependencies: @scylla/core-sdk, @scylla/ui, @scylla/base-sdk (workspace:*)
├── AGENTS.md, README.md
└── src/
    ├── index.ts            export { ScyllaCloudExtension } — and nothing else
    ├── scylla-cloud.extension.ts
    ├── generated/          protos of §2.5 (git-ignored, like scylla-base)
    └── features/auth/      phase 5
```

```typescript
@Extension({
  id: 'scylla-cloud',
  name: 'Scylla Cloud',
  version: '0.1.0',
  dependencies: ['scylla-base'],
  modules: [CloudAuthModule],
  widgetInjections: [EmailLoginWidgetInjection, SignUpLinkWidgetInjection],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaCloudExtension {}
```

The wiring outside the package:

| File | Change |
|---|---|
| `apps/web/src/extensions.ts` | add `ScyllaCloudExtension` after `ScyllaBaseExtension` |
| `apps/web/package.json` | add `"@scylla/cloud": "workspace:*"` |
| `scripts/gen-proto.mjs` | the targets of §2.5 |
| `.gitignore` | `extensions/scylla-cloud/src/generated/` |
| `lingui.config.js` | one catalog: `extensions/scylla-cloud/src/features/auth/` |
| `.dependency-cruiser.cjs` | generalize `module-declaration-is-private` to every extension, and add `widget-injection-declaration-is-private`: only `<name>.extension.ts` imports a `*.widget-injection.ts`. Exclude `extensions/*/src/generated/` where `scylla-base`'s is excluded. |
| `vite.config.ts` coverage | exclude `extensions/*/src/generated/`, `*.widget-injection.ts` like `*.module.ts` |
| root `README.md` | a row for the extension and its module |

**Done when** the app starts with the extension, and `scylla-cloud` has no module yet. **Met**,
then superseded by phase 5 adding the module in the same pass. Two depcruise rules needed a
real-world correction while implementing this phase, both now fixed in `.dependency-cruiser.cjs`:
`widget-injection-declaration-is-private`'s exemption for `*.extension.ts` had the check on the
wrong side of the edge (`to.pathNot` instead of `from.pathNot`), and `domain-is-pure` had no
provision for a domain repository importing `ScyllaResult` from an SDK — fixed with a type-only
exemption (`dependencyTypesNot: ['type-only']`), since a type-only import leaves no runtime
trace. `no-orphans` also needed a new exemption for a feature barrel with no SDK of its own to
keep it referenced (`auth`'s `index.ts` exports nothing yet, by design — §5).

### Phase 5 — The `auth` module — **done**

```
features/auth/
├── auth.module.ts                         CloudAuthModule — id 'cloud-auth', route public 'register'
├── index.ts                               nothing yet: no other module uses auth
├── AGENTS.md, README.md
├── domain/repository/registration.repository.ts
│                                          RegistrationRepository.signup(input: SignupInput): ScyllaResult<void>
│                                          SignupInput { username, email, password, organizationName }
├── infrastructure/
│   ├── repository/data-sources/registration-remote.data-source.ts
│   ├── data/remote/grpc-registration-remote.data-source.ts
│   │                                      calls Signup, then openSession(token, userId);
│   │                                      maps ALREADY_EXISTS / INVALID_ARGUMENT / UNIMPLEMENTED (§3)
│   └── repository/default-registration.repository.ts
├── locales/{en,fr}/
├── presentation/
│   ├── registration.queries.ts            registrationMutations.signup (mutationOptions)
│   ├── register-page.state.svelte.ts      RegisterPageState: the mutation, then navigateTo('/', { replace: true })
│   └── ui/
│       ├── Register/Register.page.svelte  the card: logo, title, the form, a link back to /login
│       ├── RegisterForm/RegisterForm.svelte  ScyllaForm: username, email, password, organization name
│       └── register.messages.ts
└── widget-injections/                     phase 6
```

Rules that apply:

- `RegisterPageState` is built during the component's initialisation: its mutation needs an
  owner (the same rule as `LoginState`).
- The form checks the server rules before the call: password 8 to 255 characters, fields not
  empty, an email that contains `@`. The server stays the real check.
- No `onError` in the mutation: the global handler of `scylla-base` shows the error. The data
  source gives the messages of §3.
- The `public` mount has no guard: the page needs no permission. `module-permissions.test.ts`
  checks only the pages inside the shell, so no `UNGATED_PAGES` entry is necessary.
- Never log, toast or store the password.

Tests:

- `grpc-registration-remote.data-source.test.ts` (env `node`): a success calls `openSession`
  with the token and the id; each error code gives its message. **Done** — 6 tests, mocking the
  generated client class and `@scylla/base-sdk`'s `openSession`.
- `register-page.state.svelte.test.ts`: success → redirect; failure → no redirect. **Done** —
  the `$effect.root` pattern of `grant-creator.state.svelte.test.ts`.
- `Register/Register.page.test.ts`: the fields, the disabled submit while pending, the link to
  `/login`. **Done**, plus a fourth test for the loading screen on success.

**Done** overall: 12 tests across the three files, all green, alongside `pnpm typecheck`,
`svelte-check` and the targeted lint all clean.

### Phase 6 — The two widget injections — **done**

```typescript
// features/auth/widget-injections/email-login/email-login.widget-injection.ts
import { loginPoints } from '@scylla/base-sdk';
import type { WidgetInjection } from '@scylla/core-sdk';
import { FormItemType } from '@scylla/ui';
import { emailLoginMessages } from './email-login.messages.ts';

/** Cloud users sign in with their email: the words and the field type change together. */
export const EmailLoginWidgetInjection = {
  id: 'cloud-email-login',
  changes: [
    // The words: messages, so they stay in the catalogs.
    loginPoints.texts.override({
      identifier: emailLoginMessages.email,
      identifierPlaceholder: emailLoginMessages.emailPlaceholder,
      description: emailLoginMessages.description,
    }),
    // The structure: the field becomes an email input. Its id stays: the submit reads it.
    loginPoints.fields.patch(fields =>
      fields.map(field =>
        field.id === 'identifier' && field.type === FormItemType.Input
          ? { ...field, inputType: 'email' }
          : field,
      ),
    ),
  ],
} satisfies WidgetInjection;
```

```typescript
// features/auth/widget-injections/sign-up-link/sign-up-link.widget-injection.ts
export const SignUpLinkWidgetInjection = {
  id: 'cloud-sign-up-link',
  changes: [
    loginPoints.footer.inject({ component: () => import('./SignUpLink/SignUpLink.svelte') }),
  ],
} satisfies WidgetInjection;
```

- `SignUpLink.svelte`: "Don't have an account? **Sign up**", a link to `/register`. It is
  disabled while `context.isPending`.
- The messages are in the `auth` catalog. "Email" may already exist in a `scylla-base` catalog:
  `pnpm i18n:collisions` shows it. Use the same French text, or give a `context`.

Tests:

- Each injection passes `merge-widget-injections` with the real extensions: no conflict, the
  owner `scylla-base` is a dependency. **Done**: `expect(() => loadExtensions(extensions)).not.toThrow()`
  pins this explicitly, on top of every other app-level test implicitly depending on it.
- `apps/web/src/__test__/login-widget-injections.test.ts`: load the real extensions, render the
  `/login` page with their injections, and check that the field is labelled "Email" and has the
  type `email`, that the sign-up link shows, and that it goes to `/register`. **Done** — 3 tests,
  using the exact `startCore`/real-router pattern of the existing `start.test.ts`.

### Phase 7 — The documentation — **done**

- `extensions/scylla-cloud/AGENTS.md` + `README.md`: what the extension is, its module, its
  injections, the proto target. **Done.**
- `features/auth/AGENTS.md` + `README.md`: the public API (empty), the data contract, the route,
  the two injections and the points that they change, the session rule. **Done.**
- `CLAUDE.md`: the package in the diagram "Packages", and the checklist "Adding an extension"
  gets the steps of §2.3 (injections) and §2.5 (protos). **Done** — plus a worked example of
  `widgetInjections` in the `@Extension` snippet.
- `widgets_plan.md`: the status of what v1 implements. **Done** — every phase of that plan is
  marked, and §8.2 was rewritten to match the real, empirically-corrected implementation.
- Also done, beyond this list: `docs/architecture.md` §3.5 and `docs/naming-conventions.md`
  §4.4 + the summary table (widgets and widget injections), and a row each for `scylla-cloud`
  and `auth` in the root `README.md`.

**Done when** PR 2 is merged: the login page has an email field and shows the sign-up link, and a
new user can sign up and land in their organization. **Met** in the local working tree (nothing
pushed or merged, per the user's standing instruction to commit/push only when asked): the
`login-widget-injections.test.ts` end-to-end test exercises exactly this through the real app
loader, and a manual run (`pnpm dev`) would show it live.

---

## 5. The risks

| Risk | What we do |
|---|---|
| The server has no `register` feature: `Signup` fails with `UNIMPLEMENTED`. | The page shows "Sign-up is not available on this server." The capability check comes later (§6, question 1). |
| `common` protos generated twice drift. | They come from the same `.proto` files in the same run of `gen-proto`. |
| The text override changes a message that `scylla-base` renames later. | The override does not compile any more: `texts.override` is typed on `loginMessages`. |
| `openSession` changes a behaviour of the login. | Phase 2 is a refactor with a test: same keys, same values. |

---

## 6. Open questions

1. ~~**Register on every server?**~~ *Decided: v1 always shows the sign-up link. A capability
   check against the server (hide the link when the server has no `register` feature) comes in a
   later version.* Until then, a server with no `register` feature answers `UNIMPLEMENTED`, and
   the page shows "Sign-up is not available on this server." (§3).
2. **Password confirmation.** The register form of v1 has one password field. Add a second one?
3. **The organization name.** `Signup` requires it. Ask it on the register page (v1), or create
   the organization later in an onboarding step?
4. **The French texts.** "Email" or "E-mail", "S'inscrire" or "Créer un compte": the team decides
   in phase 6.
