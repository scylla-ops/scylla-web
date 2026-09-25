# `@scylla/core`

> [Scylla frontend](../../README.md) › `packages/core` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

**The runtime that starts a Scylla frontend.** You give it a list of extensions. It loads them,
builds one router from the routes they declare, and draws the application frame around their
pages: the sidebar, the top bar, the breadcrumbs, and the theme and language switches.

The core has no business logic. It does not know what an organization, a permission or a
backend is. Everything that the user sees inside the frame comes from an extension.

```typescript
// apps/web/src/main.ts
import { startCore } from '@scylla/core';
import { ScyllaBaseExtension } from '@scylla/base';

void startCore({ extensions: [ScyllaBaseExtension], target: document.getElementById('root')! });
```

## Concepts

| Term | What it is | Declared in |
|------|------------|-------------|
| **Extension** | A package that adds features to the app. It is a class with `@Extension`. | the extension, with [`@scylla/core-sdk`](../../sdks/core-sdk/README.md) |
| **Module** | One unit inside an extension (`ScyllaModule`): its pages, its sidebar links, its dependencies. | `<feature>.module.ts` |
| **Route** | A path, its lazy page, its permission, its breadcrumb and, as an option, its sidebar link. | the `routes` of a module |
| **Mount** | A named place where routes attach, e.g. `organization` at `/:organizationSlug`. A mount brings its layout, its wrappers and its breadcrumb. | the `mounts` of a module |
| **Shell frame** | The sidebar and the top bar. The core draws them. The modules supply their contents. | the core |
| **Access policy** | How to check a route's `permission`: `can`, `ready`, `guard`. The core calls it. It does not know what it checks. | one module of the app |

## What happens at start-up

```
startCore({ extensions, target })
  │
  ├─ loadExtensions      read each @Extension, sort by dependencies, merge all modules,
  │                      and stop with an error if the declarations do not agree
  ├─ install             i18n catalogs, DI registry, query client, shell config
  ├─ compileRoutes       route trees of all modules → one flat table, most specific first
  └─ mount(App)          router + shell frame + toaster
```

Errors come at start-up, not when a user opens a page. The loader and the compiler stop the app
if one of these occurs:

- two extensions, modules, mounts or sidebar sections have the same id;
- a dependency is missing, or two extensions depend on each other;
- two modules set the same field on the same path;
- a route uses a mount that does not exist, or a sidebar section that does not exist;
- a route has a `permission`, but no module supplies an access policy.

`apps/web` runs the same loader in its tests. Thus CI finds a broken declaration before a user
does.

## How a page is rendered

A module declares a page one time. The router, the sidebar link, the breadcrumbs and the
permission check all come from this declaration:

```typescript
export const AgentsModule = {
  id: 'agents',
  domain: { agentsRepository },
  routes: {
    organization: [
      {
        path: 'agents',
        permission: Permission.LIST_AGENTS,
        breadcrumb: () => ({ label: msg`Agents` }),
        page: () => import('./presentation/ui/Agents/Agents.page.svelte'),
        nav: { section: 'organization', title: msg`Agents`, icon: HardDriveIcon, order: 40 },
      },
    ],
  },
} satisfies ScyllaModule;
```

When the URL matches `/:organizationSlug/agents`, the core renders these layers, from the
outside to the inside:

```
layout of the root mount         e.g. an authentication gate
└─ ShellFrame                     sidebar + top bar, when the root mount has shell: true
   └─ wrappers of the mounts      outermost first, e.g. "sync the organization in the URL"
      └─ access policy guard      only when the route has a permission
         └─ the page              loaded on demand, route parameters as props
```

## Design decisions

**The core knows no business.** A dependency-cruiser rule (`core-knows-no-extension`) makes
sure that the core imports no extension. Thus a second product or a community extension adds
pages, sidebar sections and shell parts in the same way as `scylla-base`, and does not change
the core.

**One declaration per page.** A sidebar link is part of its route. It uses the URL and the
permission of that route. Thus the sidebar cannot show a link to a page that will refuse
access, and there is no second list to keep in sync. The page is lazy: the guard, the sidebar
and the breadcrumbs read the static fields and do not load the page's chunk.

**Mounts, not nesting.** A module does not repeat the nesting of the app. It attaches its
routes to a mount. Modules also declare the mounts, so an extension can add pages to the mounts
of another extension.

**A tree to write, a flat table to match.** Modules write route trees, with `children`.
`compileRoutes` changes all the trees into one table of full paths. Two modules can then
contribute to the same path without an import between them. The breadcrumbs of a page are the
breadcrumbs of each path that its path starts with.

**A small router in the project, not a library.** The frame needs three things that a
general-purpose router does not supply together: route parameters for the wrappers, the
previous page kept on screen for the exit animation, and a breadcrumb trail built from several
modules. With a flat table, the remaining code is small: a loop to match, `history.pushState`,
and a click listener for links. It uses the History API because Firefox ESR and jsdom do not
support the Navigation API.

## Public API

| Export | Use |
|--------|-----|
| `startCore({ extensions, target })` | Start the app. The only call that `apps/web` makes. |
| `loadExtensions(classes)` | Read and merge the extensions. Used by tests. |
| `compileRoutes(config)` | Make the flat route table. Used by tests. |
| `createAppRouter(config)` | Make the router (`AppNavigator`). |
| `setShellConfig`, `ShellBreadcrumbs` | For app-level tests. |

Only `apps/web` imports this package. An extension uses
[`@scylla/core-sdk`](../../sdks/core-sdk/README.md) and never imports `@scylla/core`.

## Package layout

```
src/
  start-core.ts   App.svelte      the entry point and the root component
  loader/                         loadExtensions: read, sort, check and merge the extensions
  routing/
    compilation/                  declarations → flat table (pure functions)
    runtime/                      location, matching, the router
    view/                         RouterView, RoutePage, RouteEntry
  shell/                          ShellFrame, sidebar, top bar, breadcrumbs, theme, language
  query/                          the app's TanStack Query client
  locales/                        the catalog of the shell
```

## Related

- [`@scylla/core-sdk`](../../sdks/core-sdk/README.md) — the contract that an extension writes
  against, and that this package implements.
- [`@scylla/ui`](../ui/README.md) — the design system that the frame uses.
- [`scylla-base`](../../extensions/scylla-base/README.md) — the Scylla product, loaded by the
  core as an extension.
