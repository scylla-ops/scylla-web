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
| Extension | `Extension` (the class decorator), `extensionOf`, `ExtensionManifest`, `ExtensionClass`, `installedExtensions`, `setInstalledExtensions` |
| Module | `ScyllaModule`, `ModuleRoute`, `ModuleRoutes`, `NavLink`, `PageLoader`, `PageComponent`, `RouteMount`, `RouteParams`, `RouteSource` |
| Shell parts of a module | `AccessPolicy`, `NavSectionDefinition`, `ShellContributions`, `QueryErrorHandler`, `QueryRetryPolicy`, `MountDefinition`, `LayoutComponent`, `RouteWrapper` |
| Crumbs | `BreadcrumbFn`, `BreadcrumbParams`, `Crumb`, `TrailCrumb` |
| Permission type | `Register` (augmented by one extension), `RoutePermission` |
| Navigation | `navigateTo`, `navigateBack`, `currentPathname`, `currentSearch`, `routePathname`, `routeParams`, `routeTrail`, `setAppNavigator`, `AppNavigator`, `Redirect` |
| DI | `getModuleDomain`, `setDependencyRegistry`, `DomainRegistry` |
| Query | `createQuery`, `createMutation`, `createQueries`, `queryOptions`, `mutationOptions`, `getQueryClient`, `setQueryClient` |
| Widgets | `definePoints`, `point`, `ZonePoint`, `TextsPoint`, `ValuePoint`, `ZoneBinding`, `ZoneComponentOptions`, `ZonePosition`, `WidgetChange`, `widgetZone`, `WidgetInjection`, `WidgetInjectionRegistry`, `RegisteredComponent`, `RegisteredPatch`, `setWidgetInjectionRegistry`, `resolveZone`, `installWidgetInjectionsForTest` |

## Layout

```
src/
  index.ts
  extension/  extension.decorator.ts   @Extension, extensionOf, ExtensionManifest
              installed-extensions.ts  the manifests the core loaded, for a page that lists them
              contributions.struct.ts  AccessPolicy, NavSectionDefinition, ShellContributions, QueryErrorHandler, QueryRetryPolicy
              register.struct.ts       Register, RoutePermission
  routing/    scylla-module.struct.ts  ScyllaModule, ModuleRoute, NavLink
              mount.struct.ts, route.struct.ts, crumb.struct.ts, Redirect.svelte
  navigation/ navigator.ts             the AppNavigator the core installs, and its readers
  di/         dependencies.registry.ts
  query/      active-query-client.ts, svelte-query.ts
  widgets/    widget-points.struct.ts        ZonePoint, TextsPoint, ValuePoint, ZoneBinding, WidgetChange
              define-points.ts               definePoints, point
              widget-injection.struct.ts     WidgetInjection
              widget-injection-registry.ts   WidgetInjectionRegistry, setWidgetInjectionRegistry
              widget-zone.calculator.ts      resolveZone (pure)
              widget-zone.actions.svelte.ts  widgetZone (the action)
              WidgetInjectionHost.svelte     internal — mounts one injected component
              load-injected-component.ts     one cached promise per RegisteredComponent
              report-widget-injection-error.ts
              install-widget-injections-for-test.ts  installWidgetInjectionsForTest
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
- Everything else is **in the modules**, with one exception: `widgetInjections` (below) is a
  field of `@Extension` itself, not of a module — it changes another extension's UI, which is
  not what any one module owns. A feature module declares `domain` and `routes`, with its
  sidebar links in `nav`. The module that builds the frame (scylla-base: `ShellModule`) declares
  `mounts`, `navSections`, `access`, `shell`, `onQueryError`, `onQueryRetry` and `fallback`.

## Widgets — letting one extension change another's UI

Full design: `widgets_plan.md` at the repo root. This is the practical summary.

A **widget** is a component that opens **points**: a **zone** (receives components), a **text
scope** (messages that can be overridden) or a **value** (data that can be patched). The owner
defines its points once, as a value — never a `declare module`:

```typescript
// a feature's presentation/<feature>.points.ts
export const loginPoints = definePoints('login', {
  footer: point.zone<{ isPending: boolean }>(),
  texts: point.texts(loginMessages),
  fields: point.value<readonly FormItem<'identifier' | 'password'>[]>(),
});
```

`scope` is the module id — the loader uses it to find the point's owner. The feature's barrel
exports `loginPoints`; the SDK re-exports it through the feature's barrel like everything else.
The owner renders them:

```svelte
<div use:widgetZone={loginPoints.footer.with({ isPending: state.isPending })}></div>
{t(loginPoints.texts.messages.title)}
```
```typescript
const items = $derived(loginPoints.fields.resolve([/* … */]));
```

A **widget injection** is what another extension declares to change those points — components,
texts, patches, grouped by intention, never by owner. It is listed on `@Extension`, **not** on a
module:

```typescript
@Extension({
  id: 'scylla-cloud',
  modules: [CloudAuthModule],
  widgetInjections: [EmailLoginWidgetInjection, SignUpLinkWidgetInjection],
})
export class ScyllaCloudExtension {}
```
```typescript
export const SignUpLinkWidgetInjection = {
  id: 'cloud-sign-up-link',
  changes: [loginPoints.footer.inject({ component: () => import('./SignUpLink.svelte') })],
} satisfies WidgetInjection;
```

- **Declare the owner extension in `dependencies`.** `loadExtensions` rejects a change to a
  point whose owner is not a loaded dependency (or the contributor's own extension).
- **One `replace` per zone, one override per message, across the whole app.** A second one
  fails at start-up, naming both injections and their extensions.
- **Testing your own injection** (in this repo or outside it): `installWidgetInjectionsForTest`
  installs it with no owner/dependency check — render your component, read the overridden
  texts, resolve the patched value. The stricter path (the one `loadExtensions` actually runs)
  is `test/render.svelte.ts`'s `withWidgetInjections`, for this repo's own tests.

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

`setAppNavigator`, `setDependencyRegistry`, `setQueryClient` and `setInstalledExtensions` are
called by `startCore`, once. Extensions only read: `navigateTo`, `routeParams`,
`getModuleDomain`, `createQuery`, `installedExtensions`.

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
- `installedExtensions()` is empty until the core starts. Read it per call, never at import
  time: the modules load before `startCore` installs it.
- `routeParams()` and `routeTrail()` are empty until a router is installed; `currentPathname()`
  falls back to `window.location`.

## Failure modes

| Error | Cause |
|---|---|
| `No navigator installed` | a test navigates without `installTestNavigator` |
| `No dependency registry set` | a test did not install a registry (`withRegistry`) |
| `No module registered under id "x"` | the module is in no extension, or the id is misspelt |
| `X has no @Extension decorator` | a class in `apps/web/src/extensions.ts` is not decorated |
| `Two modules define points with the scope "x"` | two features called `definePoints` with the same module id |
| `Two widget injections have the id "x"` | two injections (in this or another extension) share an id — prefix it with your extension's name |
| `The injection "x" (ext) changes "y", but no loaded module has the id "…"` | the point name is wrong, or its owner module is not loaded |
| `… add "owner" to the dependencies of ext` | an injection changes a point of an extension not listed in its own `dependencies` |
| `Only one injection may replace the zone "x": …` / `Two injections override the text "x": …` | two injections conflict — thrown by `mergeWidgetInjections` (`@scylla/core`) at start-up and in tests |

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles` — all
clean. A change here is a change for every extension: keep it additive.
