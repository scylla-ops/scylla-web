export { startCore, type StartOptions } from './start-core.ts';
export { loadExtensions, type LoadedApp } from './loader/load-extensions.ts';
export {
  compileRoutes,
  type AppRouterConfig,
  type CompiledRoute,
  type RouteTable,
} from './routing/compilation/compile-routes.ts';
export { createAppRouter } from './routing/runtime/app-router.ts';
export { setShellConfig } from './shell/shell-config.ts';
export { default as ShellBreadcrumbs } from './shell/ShellBreadcrumbs.svelte';
