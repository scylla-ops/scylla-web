export type { Register, RoutePermission } from './extension/register.struct.ts';
export {
  Extension,
  extensionOf,
  type ExtensionClass,
  type ExtensionManifest,
} from './extension/extension.decorator.ts';
export {
  installedExtensions,
  setInstalledExtensions,
} from './extension/installed-extensions.ts';
export type {
  AccessPolicy,
  NavSectionDefinition,
  QueryErrorHandler,
  QueryRetryPolicy,
  ShellContributions,
} from './extension/contributions.struct.ts';

export type {
  ScyllaModule,
  ModuleRoute,
  ModuleRoutes,
  NavLink,
  PageComponent,
  PageLoader,
  RouteMount,
  RouteParams,
  RouteSource,
} from './routing/scylla-module.struct.ts';
export type { BreadcrumbFn, BreadcrumbParams, Crumb, TrailCrumb } from './routing/crumb.struct.ts';
export type { LayoutComponent, MountDefinition, RouteWrapper } from './routing/mount.struct.ts';
export { default as Redirect } from './routing/Redirect.svelte';

export {
  currentPathname,
  currentSearch,
  navigateBack,
  navigateTo,
  routeParams,
  routePathname,
  routeTrail,
  setAppNavigator,
  type AppNavigator,
  type NavigateOptions,
} from './navigation/navigator.ts';

export {
  getModuleDomain,
  setDependencyRegistry,
  type DomainRegistry,
} from './di/dependencies.registry.ts';

export { getQueryClient, setQueryClient } from './query/active-query-client.ts';
export {
  createMutation,
  createQueries,
  createQuery,
  mutationOptions,
  queryOptions,
  type CreateMutationResult,
  type CreateQueryResult,
} from './query/svelte-query.ts';

export type {
  TextsPoint,
  ValuePoint,
  WidgetChange,
  ZoneBinding,
  ZoneComponentOptions,
  ZonePoint,
  ZonePosition,
} from './widgets/widget-points.struct.ts';
export { definePoints, point, type PointOf } from './widgets/define-points.ts';
export type { WidgetInjection } from './widgets/widget-injection.struct.ts';
export {
  setWidgetInjectionRegistry,
  type RegisteredComponent,
  type RegisteredPatch,
  type WidgetInjectionRegistry,
} from './widgets/widget-injection-registry.ts';
export { resolveZone, type ResolvedZone } from './widgets/widget-zone.calculator.ts';
export { widgetZone } from './widgets/widget-zone.actions.svelte.ts';
export { installWidgetInjectionsForTest } from './widgets/install-widget-injections-for-test.ts';
