# Plan — Widgets, zones and widget injections

Status: **implemented** (Phases 1–2, on branch `feat/widget-injections`; not committed or
merged). Phase 3 (the documentation) landed as part of `scylla-cloud-v1_plan.md`'s phase 7
instead of separately. Phase 4 (`scylla-cloud`) is done — see `scylla-cloud-v1_plan.md`.

This plan adds one mechanism: an extension can change the UI of another extension, at places
that the owner declares. It can insert a component before or after a place, replace it,
override a text, or transform a value that the owner exposes.

Three words, three things:

- A **widget** is a component that opens extension points (`Login.page`, `LoginForm`).
- A **point** is what a widget opens: a **zone** (a place that receives components), a **text
  scope** (messages that can be overridden) or a **value** (data that can be patched).
- A **widget injection** is what an extension declares to change the points of another
  extension. It belongs to the extension, not to a module. The extension lists it in
  `@Extension`, next to its modules.

The whole mechanism, as a community developer sees it:

```typescript
// 1. The owner (scylla-base) exports its points. The SDK re-exports them.
import { loginPoints } from '@scylla/base-sdk';

// 2. The contributor writes one injection per intention: a list of changes on the points.
export const GithubLoginWidgetInjection = {
  id: 'cloud-github-login',
  changes: [
    loginPoints.form.inject({
      position: 'after',
      component: () => import('./GithubButton/GithubButton.svelte'),
    }),
  ],
} satisfies WidgetInjection;

// 3. The extension lists it.
@Extension({
  id: 'scylla-cloud',
  name: 'Scylla Cloud',
  version: '1.0.0',
  dependencies: ['scylla-base'],
  modules: [CloudAuthModule],
  widgetInjections: [EmailLoginWidgetInjection, GithubLoginWidgetInjection, SignUpLinkWidgetInjection],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaCloudExtension {}
```

`CLAUDE.md` stays the contract. This plan follows its rules: the core knows no business, an
extension reaches another one only through its SDK, and `$effect` is a last resort.

---

## 1. The goal

- **The Scylla team** can write the `scylla-cloud` extension (the SaaS features). It changes
  the pages of `scylla-base` without a fork and without an `if (isCloud)` in `scylla-base`.
- **The community** can write an extension that adds to the existing pages. The API is found
  by autocompletion, it is typed, and a mistake fails at compile time or at start-up.
- **The owner of a widget** keeps control. It chooses what other extensions can change. It can
  refactor everything else freely.

The reference case in this plan: `scylla-cloud` changes the login page.

| Change | Mechanism | Declared in |
|---|---|---|
| "Username" becomes "Email" (label, placeholder, description) | text override | `EmailLoginWidgetInjection` |
| The identifier field uses `inputType: 'email'` | value patch | `EmailLoginWidgetInjection` |
| A "Sign in with GitHub" button below the form | component in a zone, `after` | `GithubLoginWidgetInjection` |
| A "Create an account" link below the card | component in a zone, `after` | `SignUpLinkWidgetInjection` |
| A `/register` page and an OAuth callback page | routes on the `public` mount (exists today) | the module `CloudAuthModule` |

The split is always the same. A **module** owns pages and data: routes, a domain, queries. A
**widget injection** changes the widgets of another extension. It holds no route and no domain.

---

## 2. The principles

1. **The owner declares its points.** An extension never targets a DOM node, a CSS selector or
   a component that the owner did not open. A point is public API, like an `index.ts`.
   Everything that is not a point stays private and can change.
2. **A point is a value, exported by the SDK.** The owner defines its points as typed objects
   and exports them from its barrel. The SDK re-exports them. A contributor imports them. There
   is no `declare module`, no global name, no string to type. §13 gives the analysis behind
   this decision.
3. **The point carries its API.** Autocompletion is the documentation: `loginPoints.` lists the
   points, `loginPoints.form.` lists what a contributor can do with a zone (`inject`). No helper
   to find in another package.
4. **Three kinds of points, not more.** Zone (components), text scope (messages), value (data).
   They cover the reference case. We add a fourth kind only when a real case needs it (§11).
5. **Declared in an injection, listed by the extension.** An injection is a
   `*.widget-injection.ts` file with a `WidgetInjection` object, like a `*.module.ts` with a
   `ScyllaModule`. Nothing registers itself as a side effect of an import.
6. **One injection per intention.** An injection groups the changes that must exist together.
7. **Fail early.** A wrong point, a wrong context or a wrong text key does not compile. A
   conflict (two replacements of one zone, two overrides of one text) or a missing dependency
   fails at start-up, with a message that names the injections and their extensions.
8. **One line opens a zone.** The owner puts the Svelte action `use:widgetZone` on an element.
   The action owns the lifecycle of the injected components: it mounts them, updates their
   context, and unmounts them in `destroy`. The owner writes no lifecycle code (§8.2).
9. **One injection cannot break the widget.** Each injected component renders in its own
   `<svelte:boundary>`. A failed import or a failed patch is logged and skipped.
10. **Lazy by default.** An injected component is a dynamic import, like a `page`. It does not
    go into the entry chunk.

---

## 3. The vocabulary

| Term | Meaning |
|---|---|
| **Widget** | A component that opens points (`Login.page`, `LoginForm`). |
| **Point** | What a widget opens: a zone, a text scope or a value. A typed object, created with `definePoints`. |
| **Zone** | A point that receives components: `before`, `after`, `replace`. Opened with `use:widgetZone`. |
| **Text scope** | A point that holds messages. A contributor overrides them key by key. |
| **Value** | A point that the widget passes through the patches of the contributors. |
| **Context** | The data that a zone gives to its components. It is part of the public API of the zone. |
| **Owner** | The module that defines points and renders them. |
| **Widget injection** | A declaration of an extension (`WidgetInjection`, in a `*.widget-injection.ts`): an id and a list of changes. Listed in `@Extension({ widgetInjections })`. |
| **Change** | One item of an injection: a component in a zone, a text override, or a value patch. Made by a method of a point (`inject`, `override`, `patch`). |
| **Contributor** | The extension whose injection changes a point. |

In the prose of this plan, "injection" alone means a widget injection. **In the code, the name
always has the `Widget` prefix** (`WidgetInjection`, `widgetInjections`, `*.widget-injection.ts`).
The codebase already uses "injection" for the dependency injection (`getModuleDomain`,
`setDependencyRegistry`): the prefix keeps the two apart.

---

## 4. The packages

```
sdks/core-sdk         THE CONTRACT
                      definePoints, point.zone / point.texts / point.value
                      ZonePoint, TextsPoint, ValuePoint, WidgetChange, WidgetInjection
                      ExtensionManifest.widgetInjections       (the list in @Extension)
                      widgetZone (the action)
                      setWidgetInjectionRegistry()             (the core installs it)

packages/core         THE WIRING
                      loadExtensions merges the injections of every extension, checks the
                      conflicts and the dependencies, and gives a registry. startCore installs it.

extensions/<owner>    THE POINTS
                      <feature>.points.ts defines the points with definePoints. The feature's
                      index.ts exports them. The widgets render them.

sdks/<owner>-sdk      NOTHING NEW
                      The SDK re-exports the barrels, so it re-exports the points.

extensions/<contrib>  THE WIDGET INJECTIONS
                      src/widget-injections/<intention>/<intention>.widget-injection.ts and the
                      components that it injects. Listed in @Extension({ widgetInjections }).
```

`@scylla/ui` does not change. It knows no extension. `core-sdk` already holds the contract of
the shell (`ShellContributions`) and a component (`Redirect.svelte`), so the primitives go
there, in `sdks/core-sdk/src/widgets/`. The action is in `widget-zone.actions.svelte.ts`: an
action file that uses a rune, so it needs the `.svelte.ts` suffix.

No new dependency-cruiser rule is necessary for the owner or the SDK. A contributor imports the
points from `@scylla/base-sdk`: `extension-uses-sdks` and `sdk-is-the-door` already force that
import to go through the SDK.

### 4.1 Where an injection goes in an extension

```
extensions/scylla-cloud/src/
├── scylla-cloud.extension.ts          @Extension({ modules, widgetInjections })
├── features/                          the modules: pages, data (as in scylla-base)
│   └── cloud-auth/
│       ├── cloud-auth.module.ts       routes: /register, /auth/github/callback
│       └── index.ts                   githubLoginQueries, …
└── widget-injections/                 what this extension changes in the widgets of others
    ├── email-login/                   one folder per intention
    │   ├── email-login.widget-injection.ts
    │   └── email-login.messages.ts
    ├── github-login/
    │   ├── github-login.widget-injection.ts
    │   ├── github-login.messages.ts
    │   └── GithubButton/GithubButton.svelte
    └── sign-up-link/
        ├── sign-up-link.widget-injection.ts
        ├── sign-up-link.messages.ts
        └── SignUpLink/SignUpLink.svelte
```

`widget-injections/` is a layer **above** `features/`. An injection may import a feature of its
own extension through its `index.ts` (the GitHub button uses the queries of `cloud-auth`). A
feature never imports an injection. The same dependency-cruiser rules as for `shell/` apply
(`shell-uses-feature-api`).

**An injection that serves a feature lives in the feature**: `features/<feature>/widget-injections/`.
It can then use the internals of its feature (a message, a component, a route path). The
top-level `widget-injections/` is only for an injection that serves no feature.
`scylla-cloud-v1_plan.md` §2.3 uses this form.

In both places, a `*.widget-injection.ts` is **private, like a `*.module.ts`**: only the
extension file imports it, by path. A barrel never exports it.

### 4.2 Testing an injection from outside the monorepo

`test/render.svelte.ts` (`@test/*`) is internal: `CLAUDE.md` calls it "the only shared test code
of the workspace". It is right for `scylla-base` and `scylla-cloud`, which live in this repo.
It gives nothing to a community extension in its own repository, which can still only reach
`@scylla/core-sdk` and the SDKs.

So `core-sdk` exports a small, permissive installer of its own, next to `widgetZone`:

```typescript
/**
 * Installs these injections with no owner or conflict check — only `loadExtensions` runs those,
 * because they need the whole app's extensions and modules. Use it to test one extension's own
 * injections: render its components, read its overridden texts and patched values, with no
 * other extension loaded. Restore with `setWidgetInjectionRegistry(null)`.
 */
export const installWidgetInjectionsForTest = (
  ...injections: readonly WidgetInjection[]
): void => { … };
```

**Status: implemented, scoped down from the first draft.** The in-repo `withWidgetInjections`
(§10) is a thin wrapper around `installWidgetInjectionsForTest` plus the restore-on-cleanup
convention of `withRegistry` and the other `test/render.svelte.ts` helpers — it does **not**
re-run the owner and dependency checks of §8.1. A single component under test has no extension
or module list to check those against, and duplicating that validation a third time (it already
runs in `merge-widget-injections.test.ts` and once more at the app level) buys nothing per
`CLAUDE.md`'s minimalism rule. The full, strict path is exercised twice: unit tests of
`mergeWidgetInjections` itself in `packages/core/src/loader/__test__/`, and the app-level test
of phase 6 in `scylla-cloud-v1_plan.md`, which loads the real extensions together.

---

## 5. The contract — `sdks/core-sdk/src/widgets/`

### 5.1 The points

```typescript
// widget-points.struct.ts
import type { Component } from 'svelte';
import type { RoutePermission } from '../extension/register.struct.ts';

export type ZonePosition = 'before' | 'after' | 'replace';

export interface ZoneComponentOptions<C> {
  /** Default: `after`. */
  position?: ZonePosition;
  /** Lower first. Default: 0. Equal orders keep the load order of the extensions. */
  order?: number;
  /** Reactive: read in a `$derived`. */
  when?: (context: C) => boolean;
  /** Checked with the access policy of the app. The owner's route guard does not cover it. */
  permission?: RoutePermission;
  /** Write it `() => import('./X.svelte')`: the component keeps its own chunk. */
  component: () => Promise<{ default: Component<{ context: C }> }>;
}

/** One item of an injection. Made by a method of a point, never by hand. */
export interface WidgetChange {
  readonly point: string;
  readonly kind: 'zone' | 'texts' | 'value';
  /** Internal payload: the options, the overrides, or the patch. */
  readonly payload: unknown;
}

/**
 * The parameter of `use:widgetZone`, built by `ZonePoint.with`. Opaque to a contributor: only
 * `widgetZone` reads it. `zone` is the point's `name`.
 */
export interface ZoneBinding<C = unknown> {
  readonly zone: string;
  readonly context: C;
}

/** A place that receives components. */
export interface ZonePoint<C> {
  /** `login.form`: the scope and the key. In the errors, the registry and `data-widget-zone`. */
  readonly name: string;
  /** Contributor: put a component in this zone. */
  inject(options: ZoneComponentOptions<C>): WidgetChange;
  /** Owner: the parameter of `use:widgetZone`. */
  with(context: C): ZoneBinding;
  /**
   * Owner: `true` when an injection replaces this zone **and** would actually
   * render for this context — its `when` is evaluated too. A `replace` whose
   * `when` is false must not hide the default content: nothing would show.
   */
  hasReplacement(context: C): boolean;
}

/** Messages that contributors can override. `M` is the type of a `*.messages.ts` object. */
export interface TextsPoint<M> {
  readonly name: string;
  /** Contributor: override some messages. Each override has the type of the original message. */
  override(overrides: Partial<M>): WidgetChange;
  /** Owner: the messages, with the overrides. Render them with `t()`, as today. */
  readonly messages: M;
}

/** A value that contributors can transform. */
export interface ValuePoint<T> {
  readonly name: string;
  /** Contributor: a pure function. It returns a new value and keeps the ids that the owner reads. */
  patch(patch: (value: T) => T): WidgetChange;
  /** Owner: the value after all the patches, in load order. */
  resolve(value: T): T;
}
```

### 5.2 How the owner creates them

```typescript
// define-points.ts
export const point = {
  zone: <C>(): PointSpec<ZonePoint<C>> => …,
  texts: <M extends object>(messages: M): PointSpec<TextsPoint<M>> => …,
  value: <T>(): PointSpec<ValuePoint<T>> => …,
};

/**
 * The points of one module. `scope` is the module id: each point is named `<scope>.<key>`.
 * Throws when a scope is defined twice.
 */
export const definePoints = <S extends Record<string, PointSpec<unknown>>>(
  scope: string,
  specs: S,
): { readonly [K in keyof S]: PointOf<S[K]> } => …;
```

The mapped type is homomorphic, so the TSDoc that the owner writes on each key shows when a
contributor hovers `loginPoints.form`.

**The duplicate-scope check must survive Vite's dev server.** "Throws when a scope is defined
twice" needs a process-wide record of the scopes already taken. A naive `Set<string>` throws a
false positive the moment `vite`'s HMR re-evaluates `login.points.ts` after a save, because the
module runs again with the same scope. `definePoints` must dedupe by **module identity**, not
by call count: keep the last object it returned for a scope (`import.meta.hot?.data`, the usual
Vite pattern for state that must survive a reload), and only throw when a *different* caller —
a second, unrelated `login.points.ts` — claims a scope that is still live. The real conflict
this check exists for is two features sharing one module id, which HMR cannot produce.

### 5.3 The injection

```typescript
// widget-injection.struct.ts
/** Declared in `<intention>.widget-injection.ts`, listed in `@Extension({ widgetInjections })`. */
export interface WidgetInjection {
  /** Unique across all extensions. It names the injection in the errors. */
  readonly id: string;
  readonly changes: readonly WidgetChange[];
}
```

One new field in `ExtensionManifest` (`extension.decorator.ts`):

```typescript
/** What the extension changes in the widgets of other extensions. */
readonly widgetInjections?: readonly WidgetInjection[];
```

`ScyllaModule` does not change. A module stays pages and data.

### 5.4 The registry that the core installs

```typescript
// widget-injection-registry.ts — same pattern as `dependencies.registry.ts`.

/** One zone component, resolved and keyed. Internal: a point never exposes it. */
export interface RegisteredComponent<C = unknown> extends ZoneComponentOptions<C> {
  /** `<injectionId>#<index>`. Used by `widgetZone`'s Svelte keys and by the error messages. */
  readonly key: string;
}

/** One value patch, kept with the injection that made it, for the error messages. */
export interface RegisteredPatch<T = unknown> {
  readonly key: string;
  readonly patch: (value: T) => T;
}

export interface WidgetInjectionRegistry {
  /** Point name → its components, sorted by `order`, then by load order. */
  zones: Readonly<Record<string, readonly RegisteredComponent[]>>;
  texts: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** In load order: a patch receives the result of the patch before it. */
  values: Readonly<Record<string, readonly RegisteredPatch[]>>;
  /** The `can` of the access policy, for `permission`. */
  can?: (permission: RoutePermission) => boolean;
}

export const setWidgetInjectionRegistry = (next: WidgetInjectionRegistry | null): void => { … };

/** Read by `ZonePoint` and `widgetZone` only. Returns `[]` with no registry installed. */
export const componentsOf = (zone: string): readonly RegisteredComponent[] => { … };
```

The methods of the points read the registry when they are called, not when they are created.
So the order of the imports does not matter. With no registry installed (a unit test that does
not care), every point gives its default: a widget must work with zero injections.

---

## 6. The owner guide — how to make a widget

### 6.1 Define the points

One file per feature: `presentation/<feature>.points.ts`.

```typescript
// extensions/scylla-base/src/features/login/presentation/login.points.ts
import { definePoints, point } from '@scylla/core-sdk';
import type { FormItem } from '@scylla/ui';
import { loginMessages } from './ui/login.messages.ts';

/** What the components in the login zones receive. */
export interface LoginZoneContext {
  isPending: boolean;
}

export const loginPoints = definePoints('login', {
  /** Around the credentials form. `replace` hides the username/password form. */
  form: point.zone<LoginZoneContext>(),
  /** Below the card. */
  footer: point.zone<LoginZoneContext>(),
  /** The title, the description and the labels of the login page. */
  texts: point.texts(loginMessages),
  /** The fields of the credentials form. Keep the ids: the submit reads them. */
  fields: point.value<readonly FormItem<'identifier' | 'password'>[]>(),
});
```

The feature's `index.ts` exports them:

```typescript
export { loginPoints, type LoginZoneContext } from './presentation/login.points.ts';
```

`@scylla/base-sdk` re-exports the login barrel, so a contributor writes
`import { loginPoints } from '@scylla/base-sdk'`. Nothing changes in the SDK.

**This example shows the design, not the first build.** `scylla-cloud-v1_plan.md` implements
`footer`, `texts` and `fields` first — the points its injections use. `form` is here to show the
shape of `inject`, `position`, `replace` and `hasReplacement` (§6.2, §6.3); add it to
`login.points.ts` when its first real consumer needs it, the same call as for `fields` in
principle 6.

### 6.2 Render the points

```svelte
<!-- Login.page.svelte -->
<script lang="ts">
  const messages = loginPoints.texts.messages;
</script>

<CardHeader>
  <CardTitle>{t(messages.title)}</CardTitle>
  <CardDescription>{t(messages.description)}</CardDescription>
</CardHeader>
<CardContent>
  <div use:widgetZone={loginPoints.form.with({ isPending: state.isPending })}>
    <LoginForm handleSubmit={state.submit} isPending={state.isPending} />
  </div>
</CardContent>
<div use:widgetZone={loginPoints.footer.with({ isPending: state.isPending })}></div>
```

```typescript
// LoginForm.svelte
const items = $derived(loginPoints.fields.resolve([/* identifier, password */]));
```

With no injection, the page renders exactly as today. An empty `<div>` is a zone with no default
content: the usual form for a zone that only receives `after` components.

### 6.3 The rules for the owner

- **The scope is the module id** (`definePoints('login', …)`). The names cannot collide, and
  the loader finds the owner of each point (§8.1).
- **Open a point for a real need.** Do not open every `<div>` "in case". Each point is an API
  that you must keep. Start with the points that a known contributor needs.
- **Write a TSDoc on each point.** A contributor reads it on hover: what the zone is, what
  `replace` removes, what the value must keep.
- **Keep the context small and explicit.** Give the data and the callbacks that an injected
  component needs (`isPending`, `submit`). Never give the ViewModel or a store: that makes all
  its internals public API.
- **The context is read-only.** An injected component acts through the callbacks of the
  context, not by a change to the objects that it receives.
- **Put the zone on an element that Svelte keeps.** Not on an element inside a compound
  component of bits-ui (a menu, a select): the injected components are mounted outside the
  Svelte tree of the owner, so they do not see its Svelte context (§8.2).
- **A `replace` hides the default content. It does not unmount it.** The default content keeps
  its queries and its state. That is correct for a form. For a widget that must not run when it
  is replaced, open the zone with no default content, and render the default only when
  `loginPoints.form.hasReplacement(context)` is `false`. Always pass the same context that
  `with(context)` uses: `hasReplacement` evaluates the `when` of the `replace` injection, so a
  stale or different context could hide the default while nothing else renders.
- **A value is data, not a component.** Open one where a contributor must change a structure
  (fields, columns, menu items) and a full `replace` is too much.
- **On a point of a page with no `permission`, say so in its TSDoc.** `can` has nothing to
  check before sign-in, so a `permission` on a zone of the login page would always be denied
  and the component would silently never render (§14, question 3).
- **Document the points** in a section "Extension points" of the feature's `AGENTS.md`, and in
  the table of points of the SDK's `AGENTS.md` (§10 checks it).

### 6.4 Change a point without breaking the contributors

A point is public API. It follows the version of the extension:

| Change | Version |
|---|---|
| Add a point, add an optional field to a context, add a message to a text scope | minor |
| Remove or rename a point, remove a field of a context, change a value type, remove a message | major |
| Change the text of a message | patch — overrides stay |

To remove a point, mark it `/** @deprecated Use `loginPoints.actions`. */` for one minor
version. TypeScript strikes it through where contributors use it.

---

## 7. The contributor guide — how to write an injection

### 7.1 The injections

One injection per intention. An injection can mix components, texts and patches: it groups
what must exist together.

"Sign in with an email" is texts and a patch. They go together: an "Email" label on a `text`
field is wrong, and an `email` field labelled "Username" is wrong too.

```typescript
// extensions/scylla-cloud/src/widget-injections/email-login/email-login.widget-injection.ts
import { loginPoints } from '@scylla/base-sdk';
import type { WidgetInjection } from '@scylla/core-sdk';
import { emailLoginMessages } from './email-login.messages.ts';

export const EmailLoginWidgetInjection = {
  id: 'cloud-email-login',
  changes: [
    loginPoints.texts.override({
      identifier: emailLoginMessages.email,
      identifierPlaceholder: emailLoginMessages.emailPlaceholder,
      description: emailLoginMessages.description,
    }),
    loginPoints.fields.patch(items =>
      items.map(item => (item.id === 'identifier' ? { ...item, inputType: 'email' } : item)),
    ),
  ],
} satisfies WidgetInjection;
```

"Sign in with GitHub" and "create an account" are independent of it, and of each other. Each
one is its own injection, so the extension can remove one with no effect on the others:

```typescript
// widget-injections/github-login/github-login.widget-injection.ts
export const GithubLoginWidgetInjection = {
  id: 'cloud-github-login',
  changes: [
    loginPoints.form.inject({
      position: 'after',
      component: () => import('./GithubButton/GithubButton.svelte'),
    }),
  ],
} satisfies WidgetInjection;

// widget-injections/sign-up-link/sign-up-link.widget-injection.ts
export const SignUpLinkWidgetInjection = {
  id: 'cloud-sign-up',
  changes: [loginPoints.footer.inject({ component: () => import('./SignUpLink/SignUpLink.svelte') })],
} satisfies WidgetInjection;
```

TypeScript checks every change:

- `loginPoints.texts.override({ identifer: … })` does not compile: `identifer` is not a message.
- `loginPoints.fields.patch(items => items.length)` does not compile: the patch must return the
  fields.
- `loginPoints.form.inject({ component: … })` does not compile if the component does not take
  `{ context: LoginZoneContext }`.

The texts are `msg` descriptors in a `*.messages.ts` beside the injection, as for a component.

### 7.2 The module (only when the injection needs pages or data)

The register page and the OAuth callback are pages: they go in a module, not in the injection.

```typescript
// extensions/scylla-cloud/src/features/cloud-auth/cloud-auth.module.ts
export const CloudAuthModule = {
  id: 'cloud-auth',
  domain: { oauthRepository },
  routes: {
    public: [
      { path: 'register', page: () => import('./presentation/ui/Register/Register.page.svelte') },
      {
        path: 'auth/github/callback',
        page: () => import('./presentation/ui/GithubCallback/GithubCallback.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
```

### 7.3 The extension

```typescript
@Extension({
  id: 'scylla-cloud',
  name: 'Scylla Cloud',
  version: '1.0.0',
  dependencies: ['scylla-base'],
  modules: [CloudAuthModule],
  widgetInjections: [
    EmailLoginWidgetInjection, // texts + patch: sign in with an email
    GithubLoginWidgetInjection, // a button in `login.form`
    SignUpLinkWidgetInjection, // a link in `login.footer`
  ],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaCloudExtension {}
```

### 7.4 The injected component

```svelte
<!-- widget-injections/github-login/GithubButton/GithubButton.svelte -->
<script lang="ts">
  import type { LoginZoneContext } from '@scylla/base-sdk';

  let { context }: { context: LoginZoneContext } = $props();
</script>

<Button variant="outline" class="w-full" disabled={context.isPending} onclick={…}>
  {t(githubLoginMessages.signIn)}
</Button>
```

An injected component is an ordinary component. It follows all the rules of `CLAUDE.md`:
messages in a `*.messages.ts`, logic in a ViewModel. It reaches data through the barrel of a
feature of its own extension, or through an SDK.

### 7.5 The rules for the contributor

- **One injection per intention.** An injection groups what must exist together. The test: if
  you remove one part, are the other parts wrong? Then they stay in the same injection. If not,
  split them. An injection that has two intentions must become two injections.
- **Name the injection after its intention**, not after the widget that it changes:
  `EmailLoginWidgetInjection`, not `LoginWidgetInjection`. The folder has the same name.
- **One intention can change several widgets.** "Sign in with an email" could also change the
  text of a profile page. It stays one injection, because the parts must exist together.
- **The injection id is unique across all extensions.** Prefix it with a short name of your
  extension (`cloud-email-login`, `acme-sso-login`).
- **An injection holds no route, no domain, no query.** It lists changes. Pages and data go in a
  module of the same extension, and the injected components use its barrel.
- **Declare the owner in `dependencies`** of your `@Extension`. The loader rejects an injection
  that changes a point of an extension that is not a dependency (§8.1).
- **Import the points from the owner's SDK.** If the point that you need does not exist, ask the
  owner to open it (for the community: an issue on the owner's repository). Never read the DOM
  of the owner.
- **One `replace` per zone in the whole app.** Replace only when you must remove the default
  content. An `after` or a patch keeps the improvements of the owner.
- **A patch is pure and keeps the ids.** Return a new array, keep the items that you do not
  change, and keep the ids that the owner reads.
- **Give a `permission`** to an injected component that shows data or does an action that the
  page's permission does not cover. The owner's route guard protects the page, not your
  component. **Never on a point whose owner says it has none** (§6.3): it would always be
  denied, and the component would silently never render.
- **Your texts are in your catalogs.** Add a `lingui.config.js` entry per injection that has
  messages, and run `pnpm extract`. If your "Email" translates differently from an "Email" of
  another module, `pnpm i18n:collisions` fails: give it a `context` (see `CLAUDE.md`, i18n).

---

## 8. The runtime

### 8.1 `loadExtensions`

After the modules are merged (`packages/core/src/loader/load-extensions.ts`):

1. Collect the `widgetInjections` of each extension, in load order, then in the order of the
   list, then in the order of each injection's `changes` array. This triple order — extension,
   injection, change — is "load order" everywhere below and is the tie-break of step 6.
   **Reject** two injections with the same id.
2. **Find the owner of each change.** The scope of the point (`login` in `login.form`) is a
   module id, so the loader knows the owner extension. **Reject** a change whose scope is not
   a loaded module:
   `The injection "cloud-email-login" (scylla-cloud) changes "login.fields", but no loaded module has the id "login".`
3. **Reject** a change on an extension that the contributor does not list in `dependencies`:
   `The injection "acme-toolbar" (acme) changes "jobs.toolbar" of scylla-base: add "scylla-base" to the dependencies of acme.`
   A change on a point of the same extension needs no dependency.
4. **Reject** two `replace` components on the same zone:
   `Only one injection may replace the zone "login.form": cloud-github-login (scylla-cloud), acme-sso-login (acme-sso).`
5. **Reject** two overrides of the same message:
   `Two injections override the text "login.username": cloud-email-login (scylla-cloud), …`.
6. Sort the components of each zone by `order`. `toSorted` is stable, so the load order stays
   for equal values. Give each component the key `<injectionId>#<index>`.
7. Chain the patches of each value in load order.
8. Add the registry to `LoadedApp`, with `can` from the access policy.

`startCore` calls `setWidgetInjectionRegistry(app.widgetInjections)` next to
`setDependencyRegistry`.

Why the conflicts are errors: two extensions that fight for one label or one replacement is a
bug in the set of extensions, not a preference. A silent "last one wins" gives a page that
changes with the order of `extensions.ts`.

### 8.2 `widgetZone` — the action

> **Status: implemented** (Phase 1). This section matches the real code in
> `sdks/core-sdk/src/widgets/`, not the first draft of this plan — one assumption below did not
> survive contact with Svelte 5 and the design changed because of it.

The action mounts one small internal component per injected component:
`WidgetInjectionHost.svelte`. The host gives the Svelte part (the lazy import, the error
isolation). The action gives the DOM part (three containers, the ordering, the cleanup).

```svelte
<!-- WidgetInjectionHost.svelte — internal, not exported -->
<script lang="ts">
  import { mount, unmount } from 'svelte';
  let { part, props }: { part: RegisteredComponent; props: { context: unknown } } = $props();
  let target: HTMLDivElement;

  $effect(() => {
    let instance: object | undefined;
    let cancelled = false;

    void loadInjectedComponent(part).then(Injected => {
      if (cancelled || !Injected) return;
      try {
        instance = mount(Injected, { target, props: { get context() { return props.context; } } });
      } catch (error) {
        reportWidgetInjectionError(part.key, error);
      }
    });

    return () => {
      cancelled = true;
      if (instance) void unmount(instance);
    };
  });
</script>

<div bind:this={target} style="display: contents"></div>

<style>
  :global([data-widget-replaced] > :not([data-widget-host])) {
    display: none;
  }
</style>
```

**The build earlier in this plan used `<svelte:boundary onerror>` wrapping
`{#await loadInjectedComponent(part) then Injected} <Injected .../> {/await}`, and that did not
work: verified empirically, with a component fixture that throws during its own render, the
error escaped as an unhandled rejection instead of reaching `onerror`.** The component is
instantiated while the awaited promise resolves, outside the boundary's own synchronous render
pass, and the boundary does not reliably catch that. So the host mounts the component
**imperatively**: `mount()` runs synchronously, and a plain `try`/`catch` around it is reliable
where the boundary was not. The props use a getter (`get context()`) — the documented way to
keep a prop reactive on a component mounted through the imperative API, since `mount()`'s
`props` are not reactive unless given as getters.

**This narrows what "one injection cannot break the widget" actually covers.** The `try`/`catch`
catches the component's *construction* — its failure or an error thrown by its own top-level
`<script>`. A failure *during a later reactive update* of an already-mounted injected component
(it derefs something that becomes `null` after the context changes) is not caught: the
component was mounted through `mount()`, which starts a tree of its own, detached from the
surrounding template's effect graph — nothing in the surrounding markup can wrap it after the
fact. A failed import (§8.3) and a failure at construction are the two failure modes v1
guards against.

```typescript
// widget-zone.actions.svelte.ts — `.svelte.ts`: it uses `$state` and `$effect`
export const widgetZone: Action<HTMLElement, ZoneBinding> = (node, binding) => {
  const parts = componentsOf(binding.zone);
  node.dataset.widgetZone = binding.zone; // for the debug overlay and the tests

  if (parts.length === 0) {
    return { destroy: () => delete node.dataset.widgetZone }; // no contributor: no host
  }

  // One reactive object for all the parts: writing into it re-renders every mounted component,
  // with no remount.
  const props = $state({ context: binding.context });

  const before = createContainer();
  const replaced = createContainer();
  const after = createContainer();
  // In one call, so the order is explicit: `before`, then `replaced`, both ahead of whatever
  // Svelte already rendered as this element's own children.
  node.prepend(before, replaced);
  node.append(after);

  const mounted = new Map<string, { instance: object; wrapper: HTMLElement }>();

  const mountPart = (part: RegisteredComponent) => {
    const wrapper = createContainer();
    const instance = mount(WidgetInjectionHost, { target: wrapper, props: { part, props } });
    return { instance, wrapper };
  };

  // A real `$effect`, not a plain function called by hand: `when` and the access policy's `can`
  // are themselves reactive, so a permission that loads after mount, or a `when` that flips,
  // re-runs this with no one calling `update()`.
  $effect(() => {
    const resolved = resolveZone(parts, props.context);
    const groups = [
      [before, resolved.before],
      [replaced, resolved.replace ? [resolved.replace] : []],
      [after, resolved.after],
    ] as const;
    const wantedKeys = new Set(groups.flatMap(([, wanted]) => wanted.map(part => part.key)));

    for (const [key, entry] of mounted) {
      if (!wantedKeys.has(key)) {
        void unmount(entry.instance);
        entry.wrapper.remove();
        mounted.delete(key);
      }
    }
    for (const [container, wanted] of groups) {
      for (const part of wanted) {
        let entry = mounted.get(part.key);
        if (!entry) {
          entry = mountPart(part);
          mounted.set(part.key, entry);
        }
        // Moves the wrapper to the end of its container: doing this in `wanted`'s order, for
        // every part, reconstructs the exact right order with no diffing and no remount.
        container.appendChild(entry.wrapper);
      }
    }

    node.toggleAttribute('data-widget-replaced', resolved.replace !== undefined);
  });

  return {
    update(next) {
      if (next.zone !== binding.zone) throw new Error('A widget zone cannot change its point.');
      props.context = next.context; // the $effect above re-runs on its own
    },
    destroy() {
      for (const entry of mounted.values()) void unmount(entry.instance);
      mounted.clear();
      before.remove();
      replaced.remove();
      after.remove();
      node.removeAttribute('data-widget-replaced');
      delete node.dataset.widgetZone;
    },
  };
};
```

`createContainer` makes a `<div data-widget-host style="display: contents">`: a stable DOM
handle with no layout effect, used both as a per-part mount target and as a reorder/removal
handle (`appendChild` on a node already in the DOM moves it; it does not clone or remount).

The details that matter:

- **The action type is not generic, the point is.** An action has one parameter type for all
  its uses. `loginPoints.form.with(context)` checks the context against the zone, then gives an
  untyped `ZoneBinding` to the action.
- **Three containers, not two.** `before` and `after` sit at the start and the end of the zone
  element, around whatever Svelte already rendered as its own children — a `replace` component
  needs a third slot, `replaced`, inserted right after `before`, since there is no third edge to
  prepend or append to. None of the three is ever a sibling of the zone element: Svelte moves
  the nodes of an `{#each}` item or an `{#if}` block from their first node to their last node, so
  a sibling the action adds could stay at the old position. A child moves with its parent.
- **`destroy` removes everything the action added**: the instances (`unmount`), the three
  containers and every per-part wrapper they held, the attributes. That is the full contract
  against leaks. A test checks it (§10).
- **The context is one `$state` object.** `update` only writes into it; the `$effect` that reads
  `props.context` re-runs on its own; nothing calls a `sync()` function by hand.
- **`replace` sets `data-widget-replaced` on the zone.** The global CSS rule shipped by
  `WidgetInjectionHost.svelte` hides the default content:
  `[data-widget-replaced] > :not([data-widget-host]) { display: none }`. The rule also hides
  the children that Svelte adds later, with no per-render DOM work. The default content stays
  mounted (§6.3). **This is a real CSS rule, not a `.svelte.ts` behaviour: no unit test can see
  the `display: none` effect** — `vite.config.ts` disables CSS in the test environment
  (`css: false`) for the whole suite. Only the attribute wiring is unit-tested (§10); the visual
  result is checked once at the app level, in phase 7 of `scylla-cloud-v1_plan.md`.
- **A `replace` component shows nothing while it loads**, and the default content is already
  hidden (the attribute is set as soon as `resolveZone` finds an active `replace`, independently
  of whether its import has finished). The user never sees the username form for one frame and
  then another form.
- **`resolveZone` is a pure function** in `widget-zone.calculator.ts`. It gets the tests, in
  `// @vitest-environment node`, with no component.
- **`loadInjectedComponent` keeps one promise per component, and never rejects.** A failed
  import is logged and resolves to `null`; the host checks for `null` instead of a `{:catch}`
  block. A second mount of the same part does not import again.
- **`reportWidgetInjectionError`** logs with the key (`[widget-injections] cloud-github-login#0
  failed: …`), so the error names the injection at fault.
- **The Svelte context does not cross `mount()`.** It starts a new tree. Scylla does not use the
  Svelte context for its services (the query client and the DI are module state), so an injected
  component can use `createQuery`, `t()` and the stores regardless.
- **The point of a zone is fixed.** A different point is a different zone: use `{#key}`.

An attachment (`{@attach}`) could do the same work with a re-run in place of `update`. We use an
action because the codebase has the `*.actions.ts` convention and because `update` lets the
context change without a full remount.

### 8.3 Texts and values

- `TextsPoint.messages` is an object with one getter per key. The getter reads the registry when
  the component renders. `t()` stays in the component, so a change of language still
  re-renders.
- `ValuePoint.resolve` applies the patches in a `try/catch` each. A patch that throws is logged
  and skipped. The value continues with the result of the previous patch.

The injections are static: the core reads them once at start-up. So the registry needs no store
and no reactivity. The reactivity comes from the owner's context and `$derived`.

**Why texts and values are not actions.** An action that writes `textContent` fights with
Svelte: the next render writes the text again, and a change of language does not follow. A text
and a value are data. They must be correct before the render, so they stay functions.

---

## 9. The trust model

- The extensions are **compiled into the app** (`apps/web/src/extensions.ts`). There is no
  plugin loaded at runtime. An injected component runs with the same rights as the owner's
  code.
- So a contributor can replace the login form. That is by design: the `scylla-cloud` extension
  needs it. Review a community extension as you review a dependency.
- `permission` on an injected component is a UI gate, like a route `permission`. The backend
  stays the real control.

---

## 10. The tests

Rows 1–9: **implemented**, passing (Phases 1 and 2). The row about `scylla-cloud` itself belongs
to `scylla-cloud-v1_plan.md`.

| What | Where | How |
|---|---|---|
| `definePoints`: names, duplicate scope | `core-sdk/src/widgets/__test__/define-points.test.ts` | pure, env `node` |
| A zone/texts/value point's methods: `inject`/`with`/`hasReplacement`, `override`/`messages`, `patch`/`resolve`, each against a registry and with none installed | same file | pure, env `node` |
| `resolveZone`: positions, `when` (including one that throws), `permission` with and without `can` | `core-sdk/src/widgets/__test__/widget-zone.calculator.test.ts` | pure, env `node` |
| `widgetZone`: before/after/replace positions, `data-widget-replaced` set before the replace import resolves, a context update with no remount, a `when` that mounts/unmounts, a failed import, a component that throws at construction, nothing left after `destroy` | `core-sdk/src/widgets/__test__/widget-zone.actions.test.ts` | a `WidgetZone.fixture.svelte` that puts the action on a `<div>`, plus small single-purpose component fixtures |
| `installWidgetInjectionsForTest`: a zone component, a text override, a value patch, sorting by `order` | `core-sdk/src/widgets/__test__/install-widget-injections-for-test.test.ts` | pure, env `node` |
| `mergeWidgetInjections`: duplicate injection id, unknown scope, missing dependency, self-extension needs no dependency, two `replace`, two text overrides, order and keys, chained patches, `can` carried through | `packages/core/src/loader/__test__/merge-widget-injections.test.ts` | fake `ExtensionManifest`s, env `node` |
| The login page with no injection renders as today | the existing `Login.page.test.ts` | no change |
| The reference case: email label, email input, GitHub button, sign-up link | `login/presentation/ui/Login/Login.widget-injections.test.ts` | `withWidgetInjections(...)` with fake cloud injections |
| Every points object that the SDK exports is in the table of points of the SDK's `AGENTS.md` | `sdks/scylla-base-sdk/src/__test__/points-documented.test.ts` | reads the exports at runtime: points are values |

The helper in `test/render.svelte.ts` (implemented):

```typescript
/** Installs these injections. Does not check owners or conflicts (§4.2). Restore in `afterEach`. */
export const withWidgetInjections = (...injections: readonly WidgetInjection[]): (() => void) => {
  installWidgetInjectionsForTest(...injections);
  return () => setWidgetInjectionRegistry(null);
};
```

A contributor tests its component alone: render it with a `context` prop. It does not need the
owner's page.

---

## 11. Out of scope, and why

| Idea | Decision |
|---|---|
| **DOM injections** (an attachment that gives a node to an extension) | Not in v1. No known case needs it. When one does, add a fourth kind of point, with an `AbortController` per mount and one cleanup per change. |
| **Override of a repository** (the cloud login calls another endpoint) | Not a widget concern. See §14, question 2. |
| **Two `replace` with exclusive `when`** | Rejected in v1 to keep the conflict check static. Relax it when a real case appears. |
| **`wrap` position** (a component around the default content) | Not in v1. Add it with a `children` snippet when a case needs it. |
| **Plugins loaded at runtime** | No. The app lists its extensions. |
| **A catalog page of the points** | Later. Points are values, so `definePoints` can keep a list of them, and a dev-only page or overlay (`[data-widget-zone]`) can show them to the community. |

---

## 12. The phases

Each phase ends with the six gates clean: `pnpm typecheck`, `pnpm test`, `pnpm lint`,
`pnpm depcruise`, `pnpm depcruise:cycles`, `pnpm i18n:collisions`.

### Phase 1 — The contract and the runtime (`core-sdk`, `core`) — **done**

- `sdks/core-sdk/src/widgets/`: `definePoints`, `point`, the three point types, `WidgetChange`,
  `WidgetInjection`, the registry, `resolveZone`, `widgetZone`, `installWidgetInjectionsForTest`
  (§4.2), `WidgetInjectionHost.svelte` (its own `<style>` carries the CSS rule of `replace` —
  no separate stylesheet, no import to wire up, see §8.2).
- `ExtensionManifest.widgetInjections`. `ScyllaModule` does not change.
- `packages/core/src/loader/merge-widget-injections.ts`: owners, dependencies, conflicts, order
  — a pure function, exported from `@scylla/core`. `loadExtensions` calls it and adds
  `widgetInjections` to `LoadedApp`. `startCore` installs it next to `setDependencyRegistry`.
- `test/render.svelte.ts`: `withWidgetInjections` (§4.2 — the thin, non-strict version).
- Tests of §10, rows 1 to 6 — 58 tests, all green.
- Still open: `core-sdk` `AGENTS.md` + `README.md` (a "Widgets and widget injections" section),
  `core` `AGENTS.md` (the new checks of the loader).

Done when a fake extension in a test can use each kind of point, and each error of §8.1 fails
with a message that names the injections and their extensions. **Met.** `pnpm typecheck`,
`pnpm test` (full suite, 1643 tests), `pnpm lint` (this phase's files), `pnpm depcruise` and
`pnpm depcruise:cycles` all pass.

### Phase 2 — The login points (`scylla-base`) — **done**

- `login.points.ts`, the points in `Login.page.svelte` and `LoginForm.svelte`, the export of
  `loginPoints` and `LoginZoneContext` in the login barrel. Also done as part of this phase (not
  originally called out, but the same change): `openSession` (§14, question 1) and the field id
  rename `username` → `identifier` (§6.1's note).
- The login `AGENTS.md`: a section "Extension points", and an updated session rule naming
  `openSession`. The `AGENTS.md` of `@scylla/base-sdk`: a table of points, kept honest by
  `points-documented.test.ts`.
- Tests of §10, rows 7 to 9 — all green. `pnpm extract` confirms no French translation was lost
  by the key rename (only line-number comments moved in the `.po` files).

Done when the page renders as before with no injection, and the reference case passes with fake
cloud injections. **Met.** The existing `Login.page.test.ts` and `LoginForm.test.ts` pass
unchanged (same rendered labels). `pnpm typecheck`, `pnpm test` (full suite), `pnpm lint`,
`pnpm depcruise`, `pnpm depcruise:cycles` and `pnpm i18n:collisions` all pass. (One pre-existing,
unrelated failure in `AgentOutcomesChart.test.ts` — confirmed present on the unmodified branch
too, nothing here touches it.)

### Phase 3 — The documentation for the community — **done**

- `docs/architecture.md` §3.5 "Widget injections — changing another extension's UI": the owner
  and contributor shape, condensed from §6/§7 of this plan.
- `docs/naming-conventions.md` §4.4 and its summary table, and the table in `CLAUDE.md`:
  `*.points.ts` → `{feature}Points`; `*.widget-injection.ts` → `{Intention}WidgetInjection`.
- `CLAUDE.md`, "Adding an extension": a step on widget injections (point 5), and a step on
  per-extension proto generation (point 8) that §13's analysis did not originally call for here
  but that `scylla-cloud-v1_plan.md` §2.5 needed.

### Phase 4 — `scylla-cloud` — **done**

What actually shipped is narrower than this phase's original sketch: v1 is email + sign-up only,
no GitHub, no OAuth repository — see `scylla-cloud-v1_plan.md` for the real scope and its own
phase breakdown (phases 4–7 there cover exactly this phase).

- The two injections (email, sign-up — not three: v1 drops GitHub, `scylla-cloud-v1_plan.md`
  §1.2), and the `cloud-auth` module with its `/register` page and its registration repository.
- `.dependency-cruiser.cjs`: `widget-injection-declaration-is-private`, generalized to every
  extension (not scoped to a `widget-injections/` layer specifically — the rule matches the
  file's own `*.widget-injection.ts` suffix anywhere under an extension's `src/`, which covers
  both the top-level and the feature-nested placement of §4.1).
- The prerequisites of §14 in `scylla-base`: `openSession` (question 1) and the field rename to
  `identifier` (question 2's answer) — both done in `scylla-cloud-v1_plan.md`'s phase 3.

---

## 13. The decision: points are values

This section keeps the analysis behind principle 2.

### 13.1 The options

**A. `declare module` in the owner feature.** The owner augments empty interfaces of `core-sdk`
(`WidgetZones`, `WidgetTexts`, `WidgetValues`). A contributor writes `zone: 'login.form'`.

**B. `declare module` in `@scylla/base-sdk`.** The same, but the augmentation is in the SDK.

**C. Points as values, defined by the owner, exported by the SDK.** This plan.

### 13.2 The facts that decide

- **The repository has one TypeScript program** (`tsconfig.app.json` includes `apps`,
  `packages`, `sdks` and `extensions`). With A or B, every augmentation is visible everywhere,
  with no import. It works in the monorepo by accident. In a community extension in its own
  repository, it works only if an import chain reaches the file of the augmentation.
- **A string reaches another extension with no import.** With A or B, `zone: 'acme.toolbar'`
  targets the extension `acme` and dependency-cruiser sees nothing. The rule "an extension
  reaches another one only through its SDK" has a hole. With C, the contributor must import
  `acmePoints` from the SDK of `acme`: `extension-uses-sdks` and `sdk-is-the-door` check it.
- **The owner must type its own use of a point.** `scylla-base` never imports its SDK (rule of
  `CLAUDE.md`, and a cycle: `@scylla/base-sdk` depends on `@scylla/base`). So B puts the types in
  a package that the owner cannot read. It compiles today only because of the one program.
- **A runtime value can be checked and listed.** With C, the loader finds the owner of a change
  and checks the `dependencies` (§8.1). A test can check that each point is documented (§10). A
  dev page can list the points (§11). A type cannot do that.

### 13.3 The comparison

| Criterion | A. augmentation (feature) | B. augmentation (SDK) | C. values |
|---|---|---|---|
| Dependency visible (import, dependency-cruiser) | no | no | yes |
| Always through the SDK | no | no | yes |
| Works outside the monorepo | by an implicit import chain | by an implicit import chain | a normal import |
| Keeps the layers (the owner does not import its SDK) | yes | no: cycle | yes |
| Discovery by a contributor | know the strings | one list of strings | autocompletion `loginPoints.` |
| Rename a point | strings: partial | strings: partial | normal TS rename |
| Deprecate a point (`@deprecated`) | yes | yes | yes |
| Missing dependency caught at start-up | no | no | yes |
| Cost | none | none | a small object in a barrel that is already loaded |

### 13.4 The shape of the API

With values, there were two ways to write a change:

- **Helper functions**: `inZone(loginPoints.form, {…})`, `overrideTexts(loginPoints.texts, {…})`,
  `patchValue(loginPoints.fields, …)`. Three names to know, in another package.
- **Methods of the point**: `loginPoints.form.inject({…})`, `loginPoints.texts.override({…})`,
  `loginPoints.fields.patch(…)`. This plan.

The methods win for the community: autocompletion shows them on the point, the type of the
options comes from the point with no generic to write, and there is nothing to import from
`core-sdk` except the `WidgetInjection` type. The injection is one list, `changes`, in place of
three fields (`components`, `texts`, `patches`): a contributor learns one shape.

The owner uses other methods of the same point (`with`, `messages`, `resolve`,
`hasReplacement`). A contributor can call them, but they do nothing harmful: they only read.

---

## 14. Open questions

1. **The session after an OAuth login.** *Decided in `scylla-cloud-v1_plan.md` §2.4: the login
   barrel exports `openSession`.* Today the gRPC login data source writes `token` and
   `userId` into `localStorage`. The gRPC transport and `Auth.guard.svelte` read them. The three
   must agree (see the login `AGENTS.md`). The GitHub callback page of `scylla-cloud` must open
   a session too. Proposal: the login barrel exports `openSession(token, userId)`, so the
   storage contract stays in one place and `scylla-cloud` never writes to `localStorage`.
2. **Email or username on the backend.** *Answered: `LoginRequest.identifier` accepts a username
   or an email ("Email when the value contains '@'"). A text override is sufficient
   (`scylla-cloud-v1_plan.md` §2.1).* If the `Login` RPC accepts an email in its `username`
   field, the text override and the patch are sufficient. If not, `scylla-cloud` needs its own
   endpoint. Then the context of `login.form` gives `submit` and `scylla-cloud` replaces the
   form, or we design an override of a repository (a larger change: module ids are unique
   today).
3. ~~**The access policy on the public mount.**~~ *Decided: a documented convention, not a
   loader check.* A point does not know which route mount renders it, so the loader cannot
   generally tell a public-mount zone from a guarded one — checking it would mean threading the
   mount through every point, for one rule. The login `AGENTS.md` says a component injected into
   `login.footer` or `login.form` must not declare a `permission`: it would always be denied
   (`can` has nothing to check before sign-in) and the component would silently never render.
   `scylla-cloud-v1_plan.md` phase 6 applies it: `SignUpLinkWidgetInjection` declares none.
4. **The version of the points for the community.** §6.4 ties the points to the version of the
   extension. The team must decide if the SDK of `scylla-base` gets a changelog of its points,
   and where.
