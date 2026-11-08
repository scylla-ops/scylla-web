# `@scylla/core` — agent guide

What starts the application: it loads the extensions, compiles their routes, runs the router,
and renders the shell (sidebars, top bar and breadcrumbs). It knows no
business: no workspace, no permission enum, no backend.

**Package** `packages/core` · entry `@scylla/core` · **no router library**

## Import rules

- May import `@scylla/core-sdk` and `@scylla/ui` only (`core-knows-no-extension`, error).
  **Never an extension, never an extension SDK.**
- Only `apps/web` imports `@scylla/core` (`extension-uses-sdks` forbids it to extensions).
  An extension reaches the core through `@scylla/core-sdk`.

## Public API — `index.ts`

```typescript
startCore({ extensions, target })    loads the extensions, installs the app-wide state, mounts the app
loadExtensions(classes)              @Extension classes -> LoadedApp (router config, shell config, DI, catalogs, widget injections)
mergeWidgetInjections(extensions, can)  the widget-injection half of loadExtensions, exposed for test/render.ts
compileRoutes(config)                AppRouterConfig -> the flat RouteTable
createAppRouter(config)              compiles the routes, returns the AppNavigator
setShellConfig, ShellBreadcrumbs     for the app-level tests
type AppRouterConfig, CompiledRoute, RouteTable, LoadedApp, StartOptions
```

## Layout

```
src/
  index.ts  start-core.ts  App.svelte          RouterView + Toaster
  loader/load-extensions.ts                    checks and merges the extensions
  loader/merge-widget-injections.ts            widget injections: owners, dependencies, conflicts, order (pure)
  query/query-client.ts                        createAppQueryClient(handlers, retryPolicies)
  routing/
    compilation/                               declarations -> data, pure functions (node tests)
      route-path.ts                            split, join, key, prefix, specificity, fillPath
      flatten-routes.ts                        flattenModuleRoutes = unfoldRoutes + mergeSamePath
      compile-routes.ts                        compileRoutes, AppRouterConfig, mountPath
      nav-entries.ts                           navEntriesFor
    runtime/                                   location, matchRoute, route state, createAppRouter
    view/RouterView/                           RouterView, RoutePage, RouteEntry (+ the error
                                               boundary of a page, route-entry.messages.ts)
  shell/
    ShellFrame/                                the sidebars + top bar around the pages of a `shell` mount
    AppSidebar/                                the sidebars, built from the nav entries
                                               DoubleSidebar: the brand band, Rail, SecondSidebar
                                               (nav-rail.ts: the rail of the sections)
                                               SecondSidebarHandle: the edge that the user moves
                                               (second-sidebar-width.state.svelte.ts: the width and its limits,
                                               second-sidebar-handle.attachments.ts: the drag and the keys)
                                               Below `md`, the sheet: NavMain, where a NavGroup folds its links
                                               (nav-groups.state.svelte.ts keeps which groups are open)
    TopBar/                                    the crumbs of the route trail, after the name of the section, and `topBarEnd`
                                               (ShellBreadcrumbs, breadcrumbs.ts; SidebarTrigger on a phone only)
    nav-links.ts                               the sidebar links for `navLinks` of the SDK
    shell-config.ts                            ShellConfig, set once by startCore
  locales/                                     the catalog of the shell (tests excluded)
```

## Start-up — `startCore`

1. `loadExtensions` reads the `@Extension` of each class and checks it (below).
2. The catalogs are registered (the core's, then each extension's), the DI registry, the
   widget injection registry (`setWidgetInjectionRegistry`), the installed extensions
   (`setInstalledExtensions`), the query client (after `queryClient.mount()`) and the shell config
   are installed.
3. `initializeAppLocale()` — before the first render, so no frame shows untranslated text.
4. `setAppNavigator(createAppRouter(app.router))`, then `mount(App)`.

## `loadExtensions` — what it merges, what it refuses

It merges, from all the modules of all the extensions: the mounts, the nav sections, the
routes, the shell contributions, the query error handlers, the query retry policies, the DI registry (by module id).
It **throws**, at start-up and in `apps/web`'s conformance test, on:

- two extensions, modules, mounts or nav sections with the same id;
- a dependency that is not loaded, or extensions that depend on each other;
- a second `access` policy or a second `fallback` page; no `fallback` page at all;
- a sidebar link whose `nav.section` no module declares;
- a class without `@Extension`.

Load order: an extension comes after its `dependencies`, else in list order. Registration
order decides sidebar and route order within a section (after `NavLink.order`).

**`mergeWidgetInjections` does the same job for `widgetInjections`**, called from inside
`loadExtensions`. It reads the `points` of every module: a point's owner is the module that
lists it, and its name is `<module id>.<key>`. It names each injection `<extension id>/<key>`
(unique by construction) and **throws** on: a point that two modules list; a change on a point
that no loaded module lists; a change on an extension's point that the contributor does not
list in `dependencies` (a change on the contributor's own point needs none). Then it calls
`buildWidgetInjectionRegistry` (`@scylla/core-sdk`), which keeps the order and **throws** on two
injections that `replace` the same zone, or two that override the same message (found by its
descriptor). Every message names the injections, e.g. `acme-auth/SignUpLinkWidgetInjection`.
The text overrides go to `t()` through `setWidgetInjectionRegistry`, which installs them with
`setMessageOverrides` (`@scylla/ui/i18n`). It is exported from `@scylla/core`'s barrel so
`packages/core/src/loader/__test__/merge-widget-injections.test.ts` can reach it through the
package's public API. **`test/render.ts`'s `withWidgetInjections` does not call it** — it
wraps `installWidgetInjectionsForTest` (`@scylla/core-sdk`): the same registry builder and
conflict checks, with no owner/dependency check: a test installs only the injections it
checks, without the extensions that own their points.

## The compilation

`compileRoutes` turns the declarations into a flat table:

1. **`unfoldRoutes`** — each tree becomes a list. A child gets the path of its parents.
2. **`mergeSamePath`** — the routes on the same mount and path become one route. Parameter
   names do not count (`:id` = `:userId`). This is how two modules share a path without an
   import.
3. **`placeInMount`** — each route gets the path of its mount in front of its own.
4. **`trailOf`** — the crumbs of a page are the crumbs of each path that its path starts with.
5. **`bySpecificity`** — a static segment before a parameter, so `/login` matches before
   `/:workspaceSlug`.

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

- **`startCore` calls `queryClient.mount()`.** The app has no `QueryClientProvider`, the component
  that makes this call in other apps. Without it, no query refetches on a focus or on a reconnect.
  One focus refetches each active query that is stale, and most queries have `staleTime` 0.
- **A focus is a `visibilitychange` event.** A change of tab and a window that shows again are a
  focus. A click between two visible windows is not, because TanStack Query does not read the
  `focus` event of the window.
- **`mount()` also starts `onlineManager`.** After an `offline` event, a query or a mutation pauses
  and does not fail. It continues after the `online` event. A page with no data stays on its
  skeleton during this time.
- **`createAppQueryClient` tells the handlers when a failure is `repeated`.** A query that failed
  at its last fetch gets `repeated: true` until it has a success. During an outage, each focus and
  each poll fails again: a handler must not tell the user each time.
- **The router takes each link of the same origin, with no page load.** A link to a path that the
  server serves must have `rel="external"`, or the browser never calls the server. The compiled
  build has the same origin as the API, so this failure does not show on a Vite dev server, where
  the API has another origin.
- **`RouteEntry` reads the route once, when it mounts.** The page transition keeps the old page
  on screen for its exit animation; `RoutePage` mounts a new `RouteEntry` for each pathname.
- **A change of pathname mounts the page again, with its wrappers.** A change of the query
  string does not.
- **A page that fails, fails alone.** `RouteEntry` renders the page inside a `<svelte:boundary>`,
  and its `{#await}` has a `:catch`: a render that throws and a chunk that cannot be loaded both
  show an error in place with a "Try again" button (`route-entry.messages.ts`), which resets the
  boundary or imports the page again. The layout, the shell and the wrappers stay, and the error
  goes to the console. A redirect and the guard are outside both.
- **Route parameters arrive as props**, on the page and on each wrapper (`params`).
- **`permission` is declared once.** The guard and the sidebar read the same value. Never also
  wrap a page in the guard component.
- **The shell renders, it does not decide.** Every link comes from the `nav` of a route, every
  section from `navSections`, every part of the frame from a module's `shell`. No business
  word appears in `shell/`.
- A sidebar link carries `data-nav-url` (its path in the mount): code outside the core can point
  at a link without knowing its title. A rail item carries the URL of its first page, and
  `data-nav-group` when it comes from a group.
- **The rail shows the sections, the second sidebar shows the pages of one.** Each `NavGroup` and
  each link without a group is one rail item. A section with `railItem` is one item at the end. A
  section with `within` has no item: it replaces the pages of that item while the URL fills its
  parameters. A section with `noRailItem` has no row: a part of an extension opens it, and the
  second sidebar shows its links while the URL is on one of them. A page alone in its section still
  gets a `NavGroup`: the group names the section, the link names the page.
- **One route can have several links.** `nav` takes a list, and each link fills a parameter of the
  route with `params`. The page stays one route: with `inPageParams`, a click on a link keeps it
  mounted. A link with `danger` is apart from the links before it, and it stays red when it is the
  current one. A link with `heading` has this title above it, in the second sidebar and in the
  sheet of a phone. The title also covers the links after it, up to the next heading. A link with
  `inCommandBar: false` is in the sidebar only: use it for a filter of a list, not for a page.
- **The sheet of a phone shows a section with `noRailItem` on its pages only** (`sheetSections`).
  A click on a link closes the sheet. `NavMain` does this, because a link that changes only an
  in-page param mounts nothing.
- **The rail does not move the page.** It has a fixed slot of 56px and it opens in an absolute
  layer, by a CSS transition of its width, so the page has no layout work and a second click in
  the middle reverses it from where it is. The open rail has the width of the slot and the second
  sidebar, to the same edge as the band: at each width it covers all the second sidebar, and
  never the page. Inside it, the rows keep the width of the open rail while it moves.
- **A closed rail shows only the icons, thus a row has a tooltip with its title.** The tooltip
  shows on a hover and on a focus. The open rail shows the title in the row, thus it shows no
  tooltip.
- **Only the user opens the rail.** A hover or a focus does not open it. A click on an empty part
  of the rail or on its separator opens and closes it, and the cursor shows the direction. The
  separator is the way for the keyboard. A row opens its page and closes the rail. A press outside
  and Escape close it, except while one of its menus is open.
- **The user sets the width of the second sidebar, not of the rail.** The handle
  (`SecondSidebarHandle`) is on the right edge of the second sidebar, below the band, and the page
  follows the width. A drag moves it, and a double click gives the default width. The handle has the
  `separator` role: the arrow keys move it by 16 px, Home and End go to the limits, and Enter gives
  the default width. It is not on a page with no second sidebar, not while the access policy is not
  ready, and not in the sheet of a phone.
- **The width is in pixels, thus `ResizablePaneGroup` does not fit.** Its sizes are percent of the
  group, thus a minimum in percent gives a different width for each window, and the group must
  also hold the page.
- **The width stays between 140 px and 400 px, and the default is 200 px.** At 140 px the logo (109 px
  wide), the section titles and the headings fit on one line, and no English link is cut. Below this,
  the English links and then the titles are cut. A longer link, for example in French, is cut with an
  ellipsis, and its `title` gives the full text. At 200 px the longest link ("Exécutions en échec")
  has 14 px of free room. A resize above the default keeps 704 px for the page: a table of 640 px
  (`CARD_LAYOUT_WIDTH_PX`) and the padding of the page, thus it never turns a table into cards. A
  narrow window lowers the maximum, but never below the default. It does not change the stored
  width: a wider window gives this width back.
- **The width is for this browser only.** `localStorage` keeps it, under
  `scylla.shell.second-sidebar-width`. A drag writes it at its end, not at each move. A key writes
  it at each press. A blocked storage only forgets it.
- **A folding group never closes by itself** (in the sheet of a phone). It opens when the user goes to a page of its links.
  Only the user closes it, and it stays closed until the user opens it or goes to a page of its
  links. The open state is in memory, out of the sidebar, because a page with no shell unmounts
  the sidebar. A page load resets it. `AppSidebar` watches the pages, not `NavMain`: `NavMain`
  unmounts while the access policy is not ready.

## Tests

The core never sees a real permission: `routing/__test__/test-permission.fixture.ts` makes
opaque ones, and `TestGuard.fixture.svelte` stands in for an access policy. The catalog of the
core excludes `*.test.ts`, so the words of the tests do not reach the translators.

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
