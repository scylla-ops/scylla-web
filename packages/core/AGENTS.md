# `@scylla/core` — agent guide

What starts the application: it loads the extensions, compiles their routes, runs the router,
and renders the shell (sidebar, top bar, breadcrumbs, theme and language). It knows no
business: no organization, no permission enum, no backend.

**Package** `packages/core` · entry `@scylla/core` · **no router library**

## Import rules

- May import `@scylla/core-sdk` and `@scylla/ui` only (`core-knows-no-extension`, error).
  **Never an extension, never an extension SDK.**
- Only `apps/web` imports `@scylla/core` (`extension-uses-sdks` forbids it to extensions).
  An extension reaches the core through `@scylla/core-sdk`.

## Public API — `index.ts`

```typescript
startCore({ extensions, target })    loads the extensions, installs the app-wide state, mounts the app
loadExtensions(classes)              @Extension classes -> LoadedApp (router config, shell config, DI, catalogs)
compileRoutes(config)                AppRouterConfig -> the flat RouteTable
createAppRouter(config)              compiles the routes, returns the AppNavigator
setShellConfig, ShellBreadcrumbs     for the app-level tests
type AppRouterConfig, CompiledRoute, RouteTable, LoadedApp, StartOptions
```

## Layout

```
src/
  index.ts  start-core.ts  App.svelte          ThemeToggle + RouterView + Toaster
  loader/load-extensions.ts                    checks and merges the extensions
  query/query-client.ts                        createAppQueryClient(handlers)
  routing/
    compilation/                               declarations -> data, pure functions (node tests)
      route-path.ts                            split, join, key, prefix, specificity, fillPath
      flatten-routes.ts                        flattenModuleRoutes = unfoldRoutes + mergeSamePath
      compile-routes.ts                        compileRoutes, AppRouterConfig, mountPath
      nav-entries.ts                           navEntriesFor
    runtime/                                   location, matchRoute, route state, createAppRouter
    view/                                      RouterView, RoutePage, RouteEntry
  shell/
    ShellFrame/                                sidebar + top bar around the pages of a `shell` mount
    AppSidebar/  NavMain  nav-sections.ts      the sidebar, built from the nav entries
    TopBar  ShellBreadcrumbs  breadcrumbs.ts   the crumbs of the route trail
    SidebarTrigger  LanguageSelector/  ThemeToggle
    shell-config.ts                            ShellConfig, set once by startCore
  locales/                                     the catalog of the shell (tests excluded)
```

## Start-up — `startCore`

1. `loadExtensions` reads the `@Extension` of each class and checks it (below).
2. The catalogs are registered (the core's, then each extension's), the DI registry, the query
   client and the shell config are installed.
3. `initializeAppLocale()` — before the first render, so no frame shows untranslated text.
4. `setAppNavigator(createAppRouter(app.router))`, then `mount(App)`.

## `loadExtensions` — what it merges, what it refuses

It merges, from all the modules of all the extensions: the mounts, the nav sections, the
routes, the shell contributions, the query error handlers, the DI registry (by module id).
It **throws**, at start-up and in `apps/web`'s conformance test, on:

- two extensions, modules, mounts or nav sections with the same id;
- a dependency that is not loaded, or extensions that depend on each other;
- a second `access` policy or a second `fallback` page; no `fallback` page at all;
- a sidebar link whose `nav.section` no module declares;
- a class without `@Extension`.

Load order: an extension comes after its `dependencies`, else in list order. Registration
order decides sidebar and route order within a section (after `NavLink.order`).

## The compilation

`compileRoutes` turns the declarations into a flat table:

1. **`unfoldRoutes`** — each tree becomes a list. A child gets the path of its parents.
2. **`mergeSamePath`** — the routes on the same mount and path become one route. Parameter
   names do not count (`:id` = `:userId`). This is how two modules share a path without an
   import.
3. **`placeInMount`** — each route gets the path of its mount in front of its own.
4. **`trailOf`** — the crumbs of a page are the crumbs of each path that its path starts with.
5. **`bySpecificity`** — a static segment before a parameter, so `/login` matches before
   `/:organizationSlug`.

It **throws** when two declarations of one path set the same field; a route has a `page` and a
`redirect`; a route has a `permission` or a `nav` but no `page`; two mounts put a page on one
URL; a route names a mount that no module declares; a route declares a `permission` and no
module gives an access policy.

## Mounts, shell and guard

- A mount is data a module declares (`ScyllaModule.mounts`): `parent`, `path`, `wrapper`,
  `breadcrumb`, and on a root mount `layout` and `shell`.
- Render order of a page: **layout** (e.g. an auth gate) → **`ShellFrame`** when the root mount
  has `shell: true` → **wrappers**, outermost first → **the access policy's `guard`** when the
  route has a `permission` → the page. A root mount with neither `layout` nor `shell` renders
  its pages alone (e.g. `/login`); the others animate.
- A sidebar link opens `fillPath(entry.pattern, params)`: the mount path and the route path,
  with the parameters of the current route and the `linkParams` of the modules. A link whose
  parameters cannot be filled is hidden.

## Rules that follow from the design

- **`RouteEntry` reads the route once, when it mounts.** The page transition keeps the old page
  on screen for its exit animation; `RoutePage` mounts a new `RouteEntry` for each pathname.
- **A change of pathname mounts the page again, with its wrappers.** A change of the query
  string does not.
- **Route parameters arrive as props**, on the page and on each wrapper (`params`).
- **`permission` is declared once.** The guard and the sidebar read the same value. Never also
  wrap a page in the guard component.
- **The shell renders, it does not decide.** Every link comes from the `nav` of a route, every
  section from `navSections`, every part of the frame from a module's `shell`. No business
  word appears in `shell/`.

## Tests

The core never sees a real permission: `routing/__test__/test-permission.fixture.ts` makes
opaque ones, and `TestGuard.fixture.svelte` stands in for an access policy. The catalog of the
core excludes `*.test.ts`, so the words of the tests do not reach the translators.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
