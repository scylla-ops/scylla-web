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
| Widgets | `point`, `WidgetPoint`, `ZonePoint`, `TextsPoint`, `ValuePoint`, `ZoneComponentOptions`, `ZonePosition`, `WidgetInjection`, `installWidgetInjectionsForTest` |
| Widgets (core wiring) | `buildWidgetInjectionRegistry`, `setWidgetInjectionRegistry`, `WidgetInjectionRegistry` |

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
  widgets/    widget-points.struct.ts        WidgetPoint, ZonePoint, TextsPoint, ValuePoint, WidgetInjectionItem (internal)
              point.ts                       point.zone / point.texts / point.value
              widget-injection.struct.ts     WidgetInjection
              widget-injection-registry.ts   WidgetInjectionRegistry (keyed by point object), setWidgetInjectionRegistry
              build-widget-injection-registry.ts  buildWidgetInjectionRegistry — load order + conflict checks, for the loader and the tests
              widget-zone.calculator.ts      resolveZone (pure, internal)
              widget-zone.actions.svelte.ts  mountZone — what a zone point does as an action
              WidgetInjectionHost.svelte     internal — mounts one injected component
              load-injected-component.ts     one cached promise per RegisteredComponent
              report-widget-injection-error.ts
              install-widget-injections-for-test.ts  installWidgetInjectionsForTest
```

## `@Extension` — the only thing an extension must write

```typescript
@Extension({
  id: 'acme-auth',
  name: 'Acme Auth',
  version: '1.0.0',
  dependencies: ['scylla-base'],
  modules: [BillingModule],
  catalogs: import.meta.glob<CatalogModule>('./**/locales/*/messages.ts'),
})
export class AcmeAuthExtension {}
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
defines its points once, as values — never a `declare module` — and its module lists them:

```typescript
// a feature's presentation/<feature>.points.ts
export const loginPoints = {
  footer: point.zone<{ isPending: boolean }>(),
  texts: point.texts(loginMessages),
  fields: point.value<readonly FormItem<'identifier' | 'password'>[]>(),
};

// login.module.ts — the module lists them: the loader names them `login.<key>`
export const LoginModule = { id: 'login', domain, routes, points: loginPoints } satisfies ScyllaModule;
```

A point is identified by its object, never by a string: the registry is keyed by it, so two
points cannot collide. `points` on the module is how the loader finds a point's owner (for the
`dependencies` check) and names it `<module id>.<key>` in the errors. A point that no module
lists cannot be changed: an injection on it fails at start-up. The feature's barrel exports
`loginPoints`; the SDK re-exports it through the feature's barrel like everything else.
The owner renders them with almost the code it writes with no points:

```svelte
<div use:loginPoints.footer={{ isPending: state.isPending }}></div>  <!-- a zone point is an action -->
{t(loginMessages.title)}                                             <!-- `t` applies the overrides -->
```
```typescript
const items = $derived(loginPoints.fields.resolve([/* … */]));
```

- **A texts point opens `msg` descriptors only.** `t()` finds an override by the descriptor
  *object*, not by its id: the id is a hash of the source string, so another "Password" elsewhere
  in the app is not changed. A message with a placeholder is a function and stays closed — open a
  subset object if a messages file has some (`point.texts({ title: m.title })`).
- **A zone point is a Svelte action.** `use:loginPoints.footer={context}`, nothing to import.

A **widget injection** is what another extension declares to change those points — components,
texts, patches, grouped by intention, never by owner. It is an array of changes, listed on
`@Extension` with the **shorthand property**, **not** on a module. The key is the constant's
name, and the loader names the injection `<extension id>/<key>`: unique by construction, and
safe from minification (an object key is a string in the bundle).

```typescript
@Extension({
  id: 'acme-auth',
  modules: [SignUpModule],
  widgetInjections: { EmailLoginWidgetInjection, SignUpLinkWidgetInjection },
})
export class AcmeAuthExtension {}
```
```typescript
export const EmailLoginWidgetInjection = [
  // `msg` inline: an injection is a `.ts`. The description names the identifier too: override both.
  loginPoints.texts.override({ identifier: msg`Email`, description: msg`Enter your email.` }),
  loginPoints.fields.patch(fields => /* … */ fields),
];
```

- **Declare the owner extension in `dependencies`.** `loadExtensions` rejects a change to a
  point whose owner is not a loaded dependency (or the contributor's own extension).
- **One `replace` per zone, one override per message, across the whole app.** A second one
  fails at start-up, naming both injections and their extensions.
- **Testing your own injection** (in this repo or outside it):
  `installWidgetInjectionsForTest({ EmailLoginWidgetInjection })` installs it with
  no owner/dependency check — render your component, read the overridden
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
| `The point "x" is also listed as "y"` | one point object is in the `points` of two modules (or twice in one) |
| `The injection "ext/key" changes a point that no loaded module lists in its \`points\`` | the owner module forgot `points`, or it is not loaded |
| `… add "owner" to the dependencies of ext` | an injection changes a point of an extension not listed in its own `dependencies` |
| `Only one injection may replace the zone "x": …` / `Two injections override the text "x": …` | two injections conflict — thrown by `mergeWidgetInjections` (`@scylla/core`) at start-up and in tests |

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles` — all
clean. A change here is a change for every extension: keep it additive.
