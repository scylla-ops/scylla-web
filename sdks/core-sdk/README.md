# `@scylla/core-sdk`

> [Scylla frontend](../../README.md) › `sdks/core-sdk` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

**The API for writing a Scylla extension.** An extension imports this package and no other part
of the core. With it, the extension:

- declares itself with the `@Extension` decorator;
- declares its pages, sidebar links and dependencies in modules (`ScyllaModule`);
- navigates, reads its dependencies and runs queries at runtime (`navigateTo`,
  `getModuleDomain`, `createQuery`).

[`@scylla/core`](../../packages/core/README.md) implements this contract and installs it at
start-up.

## Write an extension

An extension is a package in `extensions/`. This example adds a **Billing** page to each
organization. It uses the `organization` mount and the `organization` sidebar section that
`scylla-base` declares.

**1. A module declares the page.**

```typescript
// extensions/billing/src/billing/billing.module.ts
import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission } from '@scylla/base-sdk';
import { CreditCardIcon } from '@lucide/svelte';

export const BillingModule = {
  id: 'billing',
  domain: {},
  routes: {
    organization: [
      {
        path: 'billing',
        permission: Permission.READ_ORGANIZATION,
        breadcrumb: () => ({ label: msg`Billing` }),
        page: () => import('./presentation/ui/Billing.page.svelte'),
        nav: { section: 'organization', title: msg`Billing`, icon: CreditCardIcon, order: 90 },
      },
    ],
  },
} satisfies ScyllaModule;
```

This one declaration gives the URL `/:organizationSlug/billing`, a sidebar link that shows only
to users with the permission, a guard on the page, and a breadcrumb.

**2. A class declares the extension.**

```typescript
// extensions/billing/src/billing.extension.ts
import { Extension } from '@scylla/core-sdk';
import type { CatalogModule } from '@scylla/ui/i18n';
import { BillingModule } from './billing/billing.module.ts';

@Extension({
  id: 'billing',
  name: 'Billing',
  version: '0.1.0',
  dependencies: ['scylla-base'],
  modules: [BillingModule],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class BillingExtension {}
```

**3. The app lists the class** in `apps/web/src/extensions.ts`:

```typescript
export const extensions: readonly ExtensionClass[] = [ScyllaBaseExtension, BillingExtension];
```

That is all. The core puts the extension after its dependencies, adds its routes to the router
and its links to the sidebar. The root [`CLAUDE.md`](../../CLAUDE.md) has the full checklist
(`package.json`, Lingui catalogs, SDK, documentation).

## What a module declares

A feature module usually declares only `id`, `domain` and `routes`. The other fields build the
frame around the pages. An app usually has them in one module (in `scylla-base`: `ShellModule`).

| Field | Use |
|-------|-----|
| `id` | Unique in the app. The key of the module in the DI registry. |
| `domain` | The objects the module's code gets with `getModuleDomain` (e.g. its repositories). |
| `routes` | Route trees, grouped by mount. |
| `mounts` | Places where routes attach: `parent`, `path`, `layout`, `wrapper`, `breadcrumb`, `shell`. |
| `navSections` | The sidebar sections, with an optional component in place of the title. |
| `access` | The access policy: `can`, `ready`, `guard`. At most one module in the app. |
| `shell` | Parts of the frame: sidebar footer, overlays, link badge, breadcrumb and link parameters. |
| `onQueryError` | Receives each query and mutation error. |
| `fallback` | The page when no route matches. Exactly one module in the app. |

A route (`ModuleRoute`) has `path`, `page` (a dynamic import), `redirect`, `permission`,
`breadcrumb`, `nav` and `children`. A `permission` guards its page only. A child route declares
its own.

## Letting another extension change your widgets, and changing theirs

Full design: [`widgets_plan.md`](../../widgets_plan.md) at the repo root. The gist: a feature
opens **points** on its own widgets — places that another extension can add a component to,
texts it can override, or data it can patch — and exports them from its barrel, like any other
part of its public API:

```typescript
// a feature's presentation/<feature>.points.ts
export const loginPoints = {
  footer: point.zone<{ isPending: boolean }>(),
  texts: point.texts(loginMessages),
};

// login.module.ts — listing them is what names them (`login.footer`) and finds their owner
export const LoginModule = { id: 'login', domain, routes, points: loginPoints } satisfies ScyllaModule;
```

A point is identified by its object, not by a string: no name to keep in sync with the module
id, and no collision between two points.

The owner writes almost the same code as with no points: `t(loginMessages.title)` does not
change (`t` applies the overrides), and a zone point is itself the Svelte action that opens the
zone — `<div use:loginPoints.footer={{ isPending }}>`. With no extension loaded, the only new file
is `<feature>.points.ts`.

Another extension changes them with a **widget injection** — an array of changes per intention,
listed on `@Extension` next to `modules` with the shorthand property, never on a module (it
changes someone else's UI, which belongs to no module of its own). The key — the constant's name
— names the injection in the errors:

```typescript
export const SignUpLinkWidgetInjection = [
  loginPoints.footer.inject({ component: () => import('./SignUpLink.svelte') }),
];

@Extension({
  id: 'scylla-cloud',
  dependencies: ['scylla-base'],
  widgetInjections: { SignUpLinkWidgetInjection },
  modules: [],
})
export class ScyllaCloudExtension {}
```

Injections are data, not classes: an array composes, is shared, and is tested in one line, and
the types of a patch's parameters are inferred from the point.

The loader rejects a change that targets an unlisted dependency, two injections that replace the
same zone, or two that override the same text — by name, at start-up and in tests, never
silently on the page.

## Runtime API

The core installs these functions at start-up. An extension only calls them.

```typescript
import { navigateTo, routeParams, getModuleDomain, createQuery, queryOptions } from '@scylla/core-sdk';

navigateTo('/acme/billing');                       // navigation
const { organizationSlug } = routeParams();        // parameters of the current route

// in billing.queries.ts — the only kind of file that reads the DI registry
const { invoiceRepository } = getModuleDomain<typeof BillingModule.domain>('billing');
const invoices = createQuery(() => queryOptions({ queryKey: ['invoices'], queryFn: … }));
```

Import `createQuery` and `createMutation` from this package, not from `@tanstack/svelte-query`.
The TanStack versions read the client from a Svelte context that the app does not set.

## Typed permissions

The core checks the `permission` of a route, but it does not know what a permission is. The
extension that owns access control gives the type, one time, with a module augmentation:

```typescript
declare module '@scylla/core-sdk' {
  interface Register {
    permission: Permission;
  }
}
```

After this, `ModuleRoute.permission` has the type `Permission` in each module. The core gives
the value to the access policy and does not read it. `scylla-base` registers its `Permission`
enum. Only one extension can do this.

## Design decisions

**A contract separate from the implementation.** If extensions imported `@scylla/core`, each
change to the router or to the shell would be a change to the extension API. With a separate
package, the core can change freely, and the extension API changes only when this package
changes. This is the same rule as the `index.ts` of a feature, at the package level.

**A decorator and a small manifest.** `@Extension` on a class is short and easy to read. The
app lists the classes in one typed file, so the set of extensions and their order are clear. No
extension registers itself as a side effect of an import. The manifest has only `id`, `name`,
`version`, `dependencies`, `modules`, `widgetInjections` and `catalogs`. The modules declare all
the rest, next to the code that uses it — `widgetInjections` is the one field that is not a
module field, because what it declares (a change to *another* extension's widgets) belongs to no
module of the extension that declares it.

**An untyped DI registry.** If the registry had a type for the domain of each module, each
feature would depend on all the other features. A module gives the type on its side instead:
`getModuleDomain<typeof XModule.domain>('x')`.

**Widget points are values, not a `declare module`.** The first design had an owner augment an
empty interface (`WidgetSlots`, …), the way `Register` works for permissions. It does not scale
past this one monorepo: the augmentation is invisible to dependency-cruiser (nothing is
*imported*), it works today only because the whole repo compiles as one TypeScript program, and
the owner cannot read it back without a cycle (it would have to import its own SDK). A point as
a value, exported through the owner's barrel and re-exported by its SDK, fixes all three: a
contributor's import is real and checked, it works the same inside or outside this monorepo, and
autocompletion on `loginPoints.` *is* the documentation. `widgets_plan.md` §13 has the full
comparison.

## Public API

| Group | Exports |
|-------|---------|
| Extension | `Extension`, `extensionOf`, `ExtensionManifest`, `ExtensionClass` |
| Module and routes | `ScyllaModule`, `ModuleRoute`, `ModuleRoutes`, `NavLink`, `PageLoader`, `RouteMount`, `RouteParams` |
| Frame | `MountDefinition`, `NavSectionDefinition`, `AccessPolicy`, `ShellContributions`, `QueryErrorHandler` |
| Breadcrumbs | `BreadcrumbFn`, `Crumb`, `TrailCrumb` |
| Permission type | `Register`, `RoutePermission` |
| Navigation | `navigateTo`, `navigateBack`, `routeParams`, `routeTrail`, `currentPathname`, `Redirect` |
| DI | `getModuleDomain` |
| Query | `createQuery`, `createMutation`, `createQueries`, `queryOptions`, `mutationOptions`, `getQueryClient` |
| Widgets | `point`, `ZonePoint`, `TextsPoint`, `ValuePoint`, `WidgetInjection`, `installWidgetInjectionsForTest` |

The `set*` functions (`setAppNavigator`, `setDependencyRegistry`, `setQueryClient`) are for the
core and for tests. The [agent guide](./AGENTS.md) has the complete list.

## Related

- [`@scylla/core`](../../packages/core/README.md) — the implementation of this contract.
- [`@scylla/base-sdk`](../scylla-base-sdk/README.md) — the API of `scylla-base`, for extensions
  that build on Scylla.
