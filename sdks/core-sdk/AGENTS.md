# `@scylla/core-sdk` — agent guide

The contract between the core and the extensions: what an extension imports to declare itself,
its routes and its shell parts, and the runtime API the core installs at start-up
(navigation, DI, the query client).

**Package** `sdks/core-sdk` · entry `@scylla/core-sdk` (one barrel)

## Import rules

- May import `@scylla/ui` only (`core-sdk-is-the-contract`, error). **Never `@scylla/core`,
  never an extension.**
- Every extension and the core import it — through `@scylla/core-sdk`, never a deep path
  (`package-api-only`, error).

## Public API

| Group | Exports |
|---|---|
| Extension | `Extension` (the class decorator), `extensionOf`, `ExtensionManifest`, `ExtensionClass` |
| Module | `ScyllaModule`, `ModuleRoute`, `ModuleRoutes`, `NavLink`, `PageLoader`, `PageComponent`, `RouteMount`, `RouteParams`, `RouteSource` |
| Shell parts of a module | `AccessPolicy`, `NavSectionDefinition`, `ShellContributions`, `QueryErrorHandler`, `QueryRetryPolicy`, `MountDefinition`, `LayoutComponent`, `RouteWrapper` |
| Crumbs | `BreadcrumbFn`, `BreadcrumbParams`, `Crumb`, `TrailCrumb` |
| Permission type | `Register` (augmented by one extension), `RoutePermission` |
| Navigation | `navigateTo`, `navigateBack`, `currentPathname`, `currentSearch`, `routePathname`, `routeParams`, `routeTrail`, `setAppNavigator`, `AppNavigator`, `Redirect` |
| DI | `getModuleDomain`, `setDependencyRegistry`, `DomainRegistry` |
| Query | `createQuery`, `createMutation`, `createQueries`, `queryOptions`, `mutationOptions`, `getQueryClient`, `setQueryClient` |

## Layout

```
src/
  index.ts
  extension/  extension.decorator.ts   @Extension, extensionOf, ExtensionManifest
              contributions.struct.ts  AccessPolicy, NavSectionDefinition, ShellContributions, QueryErrorHandler, QueryRetryPolicy
              register.struct.ts       Register, RoutePermission
  routing/    scylla-module.struct.ts  ScyllaModule, ModuleRoute, NavLink
              mount.struct.ts, route.struct.ts, crumb.struct.ts, Redirect.svelte
  navigation/ navigator.ts             the AppNavigator the core installs, and its readers
  di/         dependencies.registry.ts
  query/      active-query-client.ts, svelte-query.ts
```

## `@Extension` — the only thing an extension must write

```typescript
@Extension({
  id: 'scylla-cloud',
  name: 'Scylla Cloud',
  version: '1.0.0',
  dependencies: ['scylla-base'],
  modules: [BillingModule],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class ScyllaCloudExtension {}
```

- The decorator puts the manifest on the class. `apps/web` lists the classes; the core reads
  them with `extensionOf`. Nothing registers itself as a side effect of an import.
- It is a **standard** decorator (no `experimentalDecorators`). `vite.config.ts` sets
  `esbuild.target` so that the dev server lowers it, and the Lingui Babel pass parses it.
- Everything else is **in the modules**. A feature module declares `domain` and `routes`, with
  its sidebar links in `nav`. The module that builds the frame (scylla-base: `ShellModule`)
  declares `mounts`, `navSections`, `access`, `shell`, `onQueryError`, `onQueryRetry` and `fallback`.

## `Register` — the type of a route's `permission`

The core does not know what a permission is. The extension that owns access control augments
`Register`, and from then on `ModuleRoute.permission` has its type:

```typescript
declare module '@scylla/core-sdk' {
  interface Register { permission: Permission }
}
```

scylla-base does it in `platform/authz/presentation/authorization.ts`. Only one extension may:
two augmentations with different types do not compile.

## Runtime API — installed by the core

`setAppNavigator`, `setDependencyRegistry` and `setQueryClient` are called by `startCore`, once.
Extensions only read: `navigateTo`, `routeParams`, `getModuleDomain`, `createQuery`.

- **`DomainRegistry` is untyped per module — on purpose.** If it named each module's domain,
  every feature would depend on every other one. A feature pins the type on its side:
  `getModuleDomain<typeof XModule.domain>('x').xRepository`. **Only a `*.queries.ts` or a
  `*.state.svelte.ts` calls it**, and only with its own module id.
- **Import `createQuery` / `createMutation` from `@scylla/core-sdk`, never from
  `@tanstack/svelte-query`.** The originals read the client from the Svelte context, and no
  component puts one there (`no-restricted-imports`).
- **`@tanstack/svelte-query` pins `@tanstack/query-core` to an exact version.** Every
  `package.json` that names `@tanstack/query-core` names the same version. Two copies fork the
  cache silently.
- `getQueryClient()` falls back to a plain client until the core installs the app's. A test
  installs its own with `withQueryClient()` (`test/render.svelte.ts`, `retry: false`).
- `routeParams()` and `routeTrail()` are empty until a router is installed; `currentPathname()`
  falls back to `window.location`.

## Failure modes

| Error | Cause |
|---|---|
| `No navigator installed` | a test navigates without `installTestNavigator` |
| `No dependency registry set` | a test did not install a registry (`withRegistry`) |
| `No module registered under id "x"` | the module is in no extension, or the id is misspelt |
| `X has no @Extension decorator` | a class in `apps/web/src/extensions.ts` is not decorated |

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles` — all
clean. A change here is a change for every extension: keep it additive.
