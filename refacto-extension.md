# Refactor — Scylla as a core + extensions

Status: **implemented** on branch `refactor/extensions` (phases 1–7 and 9). Phase 8 (a
`scylla-cloud` extension) is not done, on purpose. §8 lists the decisions taken, and where the
result differs from the plan below. `CLAUDE.md` and the `AGENTS.md` of each package are the
current contract.

---

## 1. The mission

> We have started a new project layout (`extension-poc/`) where the application is split
> differently.
>
> - **`core`** holds only what is necessary to start the application: loading extensions,
>   routing, the navbar, and anything else that belongs to starting the app and its extensions.
> - **Extensions** build the interface. **`scylla-base`** is the base extension: today's
>   frontend (the feature modules, etc.).
> - To add functionality later — ourselves or the community — we add a package in
>   `extensions/`, e.g. **`scylla-cloud`** for the SaaS-only additions.
> - An extension that wants to be usable by other extensions publishes an **SDK package**
>   (like `core-sdk` today, although core is not an extension) with the types, interfaces, etc.
>   that other extensions can consume.
>
> The goal is a refactor where the `core` package contains only the logic to load extensions,
> the routing, the navbar, and the other things that belong to starting the project and its
> extensions. The `scylla-base` extension becomes the current frontend (the feature modules,
> etc.).
>
> Still to decide: what to do with the `shared/` folder (maybe part of `scylla-base`, usable by
> others through the `scylla-base` SDK?).
>
> We also need a **`scylla-ui`** package that contains the design system (today the `shadcn`
> part of `shared/`).

---

## 2. What exists today

### 2.1 The POC (`extension-poc/`)

A pnpm workspace, `packages/* sdks/* extensions/* apps/*`.

| Package | Content |
|---|---|
| `apps/web` (`@scylla/web`) | `main.ts`: `new Core()`, then `import.meta.glob('./extensions/**/*.extension.ts', { eager: true })`, then `core.init()`. One sample `scylla-base.extension.ts` (a decorated class with an empty `TestModule`). |
| `packages/core` (`@scylla/core`) | `Core` class: installs the `@Extension` handler, stores manifests in a `Registry<T>`, `init()` instantiates each extension class. |
| `sdks/core-sdk` (`@scylla/core-sdk`) | `ExtensionManifest { id, name, version?, dependencies?, modules? }`, `ModuleManifest { id, routes, nav? }`, `RouteDefinition`, `NavDefinition`, and the `@Extension` decorator (built on `createRegistrableDecorator`, with a deferred queue). |
| `extensions/scylla-base` | Empty folder. |

So the POC proves the **registration mechanism** only. Routing, navigation, DI, UI and the
real app are not connected yet.

### 2.2 The current app (repo root, `src/modules/`)

```
core/      composition root: registry.ts (THE module list + DI map), router mounts, AuthGuard,
           OrganizationSync / ContextCleaner / OrganizationRedirect wrappers, App.svelte
layout/    app shell: sidebar, top bar, breadcrumbs, org selector, NavUser, What's New
platform/  authz (Permission, can, Can), context (contextStore, navigation), di, grpc, query,
           routing (ScyllaModule, compile routes, router, RouterView)
features/  14 business modules
shared/    generic UI (91 shadcn files + composites), state helpers, stores, utils, i18n
```

### 2.3 Findings that shape the plan

1. **Today's `core/` and `layout/` are not the future `core`.** They are full of Scylla business:
   the `organization` / `project` mounts, `AuthGuard` (reads `localStorage.token`), the
   organization sync wrappers, the org selector, `syncMyPermissions` from `features/roles`.
   `core/` + `layout/` import 14 features. All of that moves to `scylla-base`. The new `core`
   is *new, generic code* that uses some of the current platform code.
2. **The routing contract depends on business types.** `ScyllaModule.routes[].permission` is
   typed as `Permission` (`@platform/authz`), `RouteMount` is the closed union
   `'public' | 'app' | 'organization' | 'project'`, and `NavLink.section` is
   `'organization' | 'system'`. The core cannot know any of these. They must become
   **extension points** that extensions declare.
3. **`platform/` splits in two.** `routing` and `di` are generic → core. `authz`, `context`,
   `grpc` are Scylla business → `scylla-base`. `query` (the `QueryClient`) is in between: the
   client is generic, but its global `onError` (clear token, redirect to `/login`, toast) is
   Scylla business.
4. **`shared/` already has the right test**: "could this live in another product, unchanged?"
   Most of it passes → it is a good candidate for `scylla-ui`. A few files fail
   (`job-status.utils.ts`, `status-config.ts`, `AgentRunInstructions`, the gRPC wrappers) → they
   belong to `scylla-base`.
5. **Features use platform a lot**: `authz` ×118, `query` ×66, `context` ×51, `di` ×24,
   `grpc` ×22, `routing` ×14 imports. Moving features into a package is mostly **alias
   changes**, not code changes, if we keep the aliases stable during the move.

---

## 3. Target architecture

### 3.1 Packages

```
apps/
  web/                     @scylla/web         the product build: lists the extensions, boots core
packages/
  core/                    @scylla/core        extension loader, router, DI, shell frame, i18n + query bootstrap
  ui/                      @scylla/ui          design system: shadcn primitives, tokens, generic composites
sdks/
  core-sdk/                @scylla/core-sdk    the extension contract (types + defineExtension)
  scylla-base-sdk/         @scylla/base-sdk    the public API of scylla-base for other extensions
extensions/
  scylla-base/             @scylla/base        today's app: 14 features + authz, context, grpc, shell content
  scylla-cloud/            @scylla/cloud       (later) SaaS additions
```

### 3.2 Dependency direction (enforced, like today's layers)

```
apps/web ─────────────► core ──► core-sdk
   │                     │
   │                     └──────► ui
   ▼
extensions/* ──► core-sdk, ui, <other>-sdk      never another extension's package
<x>-sdk      ──► core-sdk (+ ui for types only)
ui           ──► nothing Scylla
```

- An extension **never** imports another extension. It imports its SDK. This is the package
  version of today's rule "reach a feature through its `index.ts` only".
- `core` **never** imports an extension or an extension SDK.
- Package-level cycles are forbidden (same gate as `depcruise:cycles` today).

### 3.3 What each package owns

**`@scylla/core-sdk`** — the contract, no Scylla business:
- `ExtensionManifest`: `id`, `name`, `version`, `dependencies` (extension ids), `modules`,
  `contributes` (see extension points below).
- `ModuleManifest`: today's `ScyllaModule`, generalized: `{ id, domain, routes }`.
- Extension points that **extensions declare** and the core only renders:
  - **mounts** — `public`, `app`, `organization`, `project` become mounts that `scylla-base`
    declares (with their path, layout, wrapper, breadcrumb). `scylla-cloud` can graft routes on
    them, or declare its own.
  - **nav sections** — `organization`, `system` are declared by `scylla-base`.
  - **route guard** — a route carries an opaque `access` value; an extension registers the one
    `AccessChecker` that evaluates it. `scylla-base` registers the `Permission` checker. The core
    stays ignorant of `Permission`.
  - **shell slots** — sidebar header (org selector), sidebar footer (user menu), top-bar
    controls, overlays (What's New). Each slot takes a lazy component loader.
- `defineExtension(manifest)` helper (see §7, Q1).

**`@scylla/core`** — only what starts the app:
- Extension loader: collect manifests, check `dependencies` (topological order, clear error on
  a missing or cyclic one), merge modules, mounts, sections, slots.
- DI: today's `platform/di`, fed by all modules of all extensions (module ids namespaced by
  extension to avoid clashes).
- Routing: today's `platform/routing` (compile, match, `RouterView`, `RouteEntry`), with the
  business types replaced by the extension points above.
- Shell frame: `App.svelte`, the layout frame (sidebar + top bar + breadcrumbs + page area),
  the sidebar built from nav entries — the **navbar** of the mission. Theme toggle and language
  selector are generic, so they can stay here.
- Bootstrap: i18n init (merge the catalogs of all extensions), the `QueryClient` with a
  pluggable global error handler.

**`@scylla/ui`** — the design system:
- `shadcn/` primitives (bits-ui), `cn`, Tailwind theme / tokens (`index.css`), `LucideIcon`.
- The generic composites that pass the "another product" test: `ScyllaDialog`, `DataTable`,
  `Pagination`, `FeatureHeader`, `ScyllaForm` / `FormDialog` / `createFormState`,
  `ConfirmOperationAlertDialog`, `ErrorState`, `PageTransition`, motion, toast, theme store,
  selection/pagination state helpers (see §7, Q3).

**`@scylla/base`** (extension `scylla-base`) — the current product:
- The 14 features, unchanged in their internal Clean Architecture.
- `authz`, `context`, `grpc`, generated proto code, `ScyllaResult`.
- The Scylla shell content: `AuthGuard`, the org/project wrappers, the organization redirect,
  the org selector, `NavUser`, What's New, the global error policy (token clear + `/login`).
- Its manifest declares the mounts, nav sections, access checker and slot contributions.

**`@scylla/base-sdk`** — what other extensions may use from `scylla-base`:
- `Permission` + `can` / `Can`, `contextStore` (read side) + navigation helpers, the query
  factories that are safe to cross (the ones that check `can(...)` themselves, like
  `jobsByPipelinesQueries`), domain entity/struct types, loaders of composable pages.
- This is today's set of feature `index.ts` barrels, promoted to a package.

---

## 4. Key design decisions (proposed)

| # | Decision | Why |
|---|---|---|
| D1 | Composition at **build time** (workspace packages, one Vite bundle). No runtime plugin loading in this refactor. | Keeps lazy pages, tree-shaking, one Svelte instance, typecheck across packages. Runtime loading (import maps / federation) can come later on top of the same manifest. |
| D2 | Mounts, nav sections, access control and shell slots are **declared by extensions**, not by core. | Otherwise core must know "organization", "project" and `Permission`, and it is not generic. |
| D3 | An extension's SDK is the **only** door into that extension. | Same rule as today's barrels, lifted to packages. Machine-enforced. |
| D4 | Keep today's internal structure of features (domain / infrastructure / presentation, `*.module.ts`, queries, ViewModels). | The refactor moves boundaries; it does not rewrite features. |
| D5 | Migrate with `git mv` and stable aliases first, then change contracts. | Keeps history and keeps every step green. |
| D6 | `svelte`, `@tanstack/*`, `bits-ui`, `@lingui/core` are **peer dependencies** of packages, provided once by `apps/web`. | One instance of each singleton (Svelte runtime, query client, i18n). |

---

## 5. Plan

Each phase ends with all six gates green (`typecheck`, `test`/`coverage`, `lint`,
`depcruise`, `depcruise:cycles`, `i18n:collisions`), and is one PR.

### Phase 0 — Align
- Review this document, answer §7, lock the package names.

### Phase 1 — Workspace skeleton, no behavior change
- Turn the repo root into the pnpm workspace (take `pnpm-workspace.yaml`, `tsconfig.base.json`
  from the POC). Decide the fate of `extension-poc/` (it becomes the root layout, then is
  deleted).
- `git mv src/modules/* extensions/scylla-base/src/` as one block; `apps/web` gets `main.ts`,
  `index.html`, `vite.config.ts`, and imports scylla-base's current `App`.
- Keep the `@/`, `@core`, `@platform`, `@shared`, `@shadcn` aliases pointing to the new paths.
- Update `lingui.config.js` paths, the depcruise config, vitest config, scripts
  (`gen-proto`, `check-*`, `restore-translations`). Run `restore-translations --dry-run`.
- Result: same app, new folders.

### Phase 2 — Extract `@scylla/ui`
- Move `shared/presentation/ui/shadcn`, `cn`, `index.css` tokens, and the generic composites
  (per §7 Q3) to `packages/ui`. Replace `@shadcn` / `@shared/presentation/ui` imports with
  `@scylla/ui` (codemod).
- Tailwind 4: add `@source` for the `packages/ui` and `extensions/*` folders so classes are
  not purged.
- Move the `shared` catalog strings used by those components; run `restore-translations`.

### Phase 3 — The contract in `@scylla/core-sdk`
- Replace the POC's `ModuleManifest` / `RouteDefinition` / `NavDefinition` with the real
  types from `platform/routing/declaration/*`, generalized: open `RouteMount` and nav section
  ids, `access` instead of `permission`, `ShellSlot`, `AccessChecker`, `ExtensionManifest`.
- Unit tests on types with `satisfies` fixtures.

### Phase 4 — Build `@scylla/core`
- Move `platform/routing` and `platform/di` into `packages/core`; adapt them to the new
  contract (mounts and sections come from manifests; the guard calls the registered
  `AccessChecker`).
- Write the extension loader (dependency order, duplicate id check, merge) — replaces the POC's
  `Core` / `Registry`.
- Write the generic shell frame (from today's `Layout`, `AppSidebar`, `NavMain`, `TopBar`,
  `ScyllaBreadcrumbs`, `App.svelte`) with the slots.
- Bootstrap: `startCore({ extensions })` → i18n, query client, DI, router, mount.
- Port the routing/DI tests.

### Phase 5 — Make `scylla-base` a real extension
- `extensions/scylla-base/src/scylla-base.extension.ts`: the manifest. Its `modules` = today's
  `registry.ts` list; its `contributes` = the 4 mounts, 2 nav sections, `Permission` access
  checker, shell slots (org selector, NavUser, What's New), global error policy.
- Move the Scylla-specific parts of today's `core/` and `layout/` under
  `extensions/scylla-base/src/shell/`.
- `apps/web/src/main.ts` becomes `startCore({ extensions: [scyllaBase] })`.
- Port `module-permissions.test.ts` and `feature-permissions.test.ts`: they enumerate the
  compiled routes of **all loaded extensions**, not of one list.

### Phase 6 — `@scylla/base-sdk`
- Create the package from the exports of the 14 feature barrels + `authz` + `context`.
- Inside scylla-base, features keep importing each other through their barrels (unchanged).
  The SDK is the door for *other* extensions only.

### Phase 7 — Tooling at package level
- depcruise: package rules of §3.2 on top of today's in-module rules; module-cycle script over
  the whole workspace.
- `pnpm -r` scripts (typecheck, test, lint) + root scripts for the CI gates; coverage
  thresholds per package (ratchet unchanged).
- i18n: one catalog set per extension; `i18n:collisions` across all extensions (the runtime
  still merges into one flat map).

### Phase 8 — Prove it with a second extension
- `extensions/scylla-cloud` minimal: one page on the `organization` mount, one nav entry, one
  shell slot contribution, it reads `contextStore` and gates with `Permission` from
  `@scylla/base-sdk`. If this needs a deep import or a change in core, the contract is wrong.

### Phase 9 — Docs
- Rewrite `CLAUDE.md` (layers → packages), `docs/architecture.md`, an `AGENTS.md` + `README.md`
  per package, and an "Writing an extension" guide for the community.

---

## 6. Risks

- **Big-bang moves.** Phases 1 and 2 touch ~760 files. Mitigation: pure `git mv` + codemods, no
  logic changes in the same PR, and no other feature work merged during those two PRs.
- **Lost translations.** Catalogs are keyed by path; `extract --clean` drops what moved. Run
  `restore-translations` after each move.
- **Duplicate singletons.** Two copies of Svelte / TanStack / Lingui break the app silently.
  Peer deps + Vite `resolve.dedupe`.
- **Lazy loading regression.** A manifest that imports a page statically puts it back in the
  entry chunk. Keep `page: () => import(...)` and add a bundle check.
- **Contract too early.** Community extensions freeze the SDK. Keep all packages `private` and
  the SDKs at `0.x` until `scylla-cloud` has proven them.

---

## 7. Open questions (answered — see §8)

**Q1. `@Extension` decorator or `defineExtension()` object?**
The POC uses a class decorator with `experimentalDecorators` + eager glob side effects. I
propose a plain object, like today's `*.module.ts`:
`export const scyllaBase = defineExtension({ ... })`, and an explicit list in `apps/web`.
Reasons: the class instance does nothing today; no global handler / ordering problem; esbuild
does not support `emitDecoratorMetadata`; an explicit list is typed and shows the load order.
If you want the decorator (for example for a future plugin API based on classes and
lifecycle hooks), say so and I keep it.

**Q2. Build-time only, or runtime-loaded extensions too?**
I propose build-time only for this refactor (D1). Is a community extension installed as an
npm package and the app rebuilt acceptable for now?

**Q3. Where does `shared/` go?** My proposal splits it three ways:
- design system + generic composites + generic state helpers (`createSelection`,
  `createPagination`, `createFormState`, `createStore`, `toRune`, theme, toast, `t()`) →
  `@scylla/ui`;
- `ScyllaResult`, pagination structs, gRPC wrappers, `job-status` / `status-config`,
  `AgentRunInstructions`, `SecretRevealDialog` → `scylla-base`, exposed via `@scylla/base-sdk`;
- nothing stays as a "shared" package.

Alternative: keep `@scylla/ui` strictly = shadcn primitives + tokens, and put the composites
in a separate `@scylla/kit`. Which do you prefer?

**Q4. What exactly does "navbar in core" mean?** I understand: core renders the sidebar
frame and the nav entries, and extensions fill it (sections, entries, slots). The org
selector and the user menu stay in `scylla-base`. Correct?

**Q5. Is the login / auth part of core or of `scylla-base`?** I put it in `scylla-base`
(it is a Scylla backend concern). If `scylla-cloud` needs another auth (SSO), it would
replace the `app` mount layout. Alternative: an "auth provider" extension point in core.

**Q6. Should `scylla-cloud` be able to *change* scylla-base, not only add to it?**
For example hide a nav entry, replace a page, or add a column to a table. This decides if we
need override / slot points inside features, which is much more work. I propose: add-only in
this refactor.

**Q7. Where does the repo end up?** I propose the repo root becomes the workspace and
`extension-poc/` is removed after Phase 1. Also: `CLAUDE.md` says commands run from
`apps/frontend/`, but the app is at the repo root today — the new layout will fix this.

**Q8. SDK = types only, or types + runtime?** `Permission` is an `enum` and `contextStore` is a
store: both are runtime values. I propose that an SDK may hold runtime code, and it is the
single instance (the extension imports it too). Anything that needs the extension's internals
(query factories that call `getModuleDomain`) is exported by the SDK as a thin wrapper over a
DI token that core resolves at runtime. OK?

---

## 8. Decisions taken, and what differs from the plan

| # | Decision |
|---|---|
| Q1 | **`@Extension` class decorator**, as in the POC — a standard decorator, no `experimentalDecorators`. It puts the manifest on the class; `apps/web/src/extensions.ts` lists the classes (no import side effects, no deferred queue). `vite.config.ts` sets `esbuild.target: 'es2022'`, so the dev server lowers it too. |
| — | **The manifest is small: `{ id, name, version, dependencies?, modules, catalogs? }`.** The mounts, nav sections, access policy, shell parts, query-error handler and fallback page are optional fields of a **module**, not of the extension. scylla-base has them in `ShellModule` (`shell/shell.module.ts`). Sidebar links stay on the routes of each feature module (`nav`). |
| Q2 | Build-time composition only. |
| Q3 | `shared/` split: the design system, the generic composites, the state helpers, the stores, the i18n runtime, the theme tokens and the logos → `@scylla/ui`. `ScyllaResult`, status presentation, `StatusBar`, `AgentRunInstructions`, toast messages, gRPC wrappers → scylla-base `shared/`. |
| Q4 | The core renders the sidebar frame, the nav entries, the top bar and the breadcrumbs. The organization selector, the user menu, the "New" badge and the release dialog are contributions of `ShellModule`. The theme toggle and the language selector are generic and stay in the core. |
| Q5 | Login and the auth gate are in scylla-base (`AppLayout` = `AuthGuard` + `OrganizationGate`, the layout of the `app` mount). |
| Q6 | Add-only. |
| Q7 | The repository root is the workspace. `extension-poc/` is left untouched (untracked) for reference; ESLint ignores it. Delete it when you want. |
| Q8 | **`@scylla/base-sdk` is a facade**: `export *` of the feature and platform barrels of scylla-base (plus `ScyllaResult`), through subpath exports of `@scylla/base`. There is one instance of every store; scylla-base never imports its SDK. |
| — | **One toolchain at the root** instead of `pnpm -r` per package: one Vite/Vitest config, one ESLint, one dependency-cruiser config, one Lingui config. Packages are real workspace packages (`package.json` `exports`), resolved through `node_modules`. |
| — | **Route permission type**: `@scylla/core-sdk` has an empty `Register` interface; scylla-base augments it with `permission: Permission`, so `ModuleRoute.permission` keeps its type and the core stays blind to it. |
| — | The app-level conformance tests (`module-permissions`, `breadcrumb-trail`) moved to `apps/web/src/__test__/`, because they enumerate every extension. `feature-permissions` stays in scylla-base `shell/__test__/`. |
| — | `scripts/restore-translations.mjs` now keys a translation by `msgctxt` + `msgid`: before, it could restore the feminine "Inconnue" into the neutral "Unknown". The French catalogs are identical to `main`'s (checked entry by entry). |
