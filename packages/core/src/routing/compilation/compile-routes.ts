import type { Component } from 'svelte';
import type {
  AccessPolicy,
  BreadcrumbFn,
  LayoutComponent,
  MountDefinition,
  PageLoader,
  RouteMount,
  RoutePermission,
  RouteSource,
  RouteWrapper,
} from '@scylla/core-sdk';
import { flattenModuleRoutes, mergeSamePath, type FlatRoute } from './flatten-routes.ts';
import {
  bySpecificity,
  joinPath,
  pathKey,
  splitPath,
  startsWithPath,
  type RoutePath,
} from './route-path.ts';

export interface AppRouterConfig {
  mounts: Readonly<Record<RouteMount, MountDefinition>>;
  modules: readonly RouteSource[];
  /** Rendered without any layout. */
  fallback: Component;
  /** Around the pages of a root mount that asks for the shell. */
  shell?: LayoutComponent;
  /** Around every page that declares a `permission`. */
  guard?: AccessPolicy['guard'];
}

/** A crumb on the way to a page, and how many URL segments its path covers. */
export interface TrailMark {
  breadcrumb: BreadcrumbFn;
  depth: number;
}

/** A page or a redirect, with everything needed to render it. */
export interface CompiledRoute {
  mount: RouteMount;
  /** From the root, e.g. `[':organizationSlug', 'agents']`. */
  path: RoutePath;
  page?: PageLoader;
  redirect?: string;
  permission?: RoutePermission;
  /** The layout of the root mount, around the shell. */
  layout?: LayoutComponent;
  /** The root mount renders its pages inside the shell. */
  shell: boolean;
  /** From the outermost. */
  wrappers: readonly RouteWrapper[];
  /** From the root. */
  trail: readonly TrailMark[];
}

export interface RouteTable {
  routes: readonly CompiledRoute[];
  fallback: Component;
  shell?: LayoutComponent;
  guard?: AccessPolicy['guard'];
}

type Mounts = AppRouterConfig['mounts'];

export const mountChain = (mount: RouteMount, mounts: Mounts): MountDefinition[] => {
  const definition = mounts[mount] as MountDefinition | undefined;
  if (!definition) throw new Error(`No extension declares the mount "${mount}".`);

  const { parent } = definition;
  return [...(parent ? mountChain(parent, mounts) : []), definition];
};

/** The path of a mount from the root, e.g. `project` → `/:organizationSlug/projects/:projectId`. */
export const mountPath = (mount: RouteMount, mounts: Mounts): RoutePath =>
  mountChain(mount, mounts).flatMap(definition => splitPath(definition.path));

const mountCrumbs = (mounts: Mounts): FlatRoute[] =>
  Object.keys(mounts).flatMap(mount => {
    const { breadcrumb } = mounts[mount];
    return breadcrumb ? [{ mount, path: [], breadcrumb, declaredBy: [`mount "${mount}"`] }] : [];
  });

/** Moves a route from its mount to the root: `agents` → `:organizationSlug/agents`. */
const placeInMount = (route: FlatRoute, mounts: Mounts): FlatRoute => ({
  ...route,
  path: [...mountPath(route.mount, mounts), ...route.path],
});

/**
 * The crumbs of a page: those of every path its own path starts with, from the
 * root. So the page of `jobs/:jobId` shows the crumb that another module
 * declares on `jobs`.
 */
export const trailOf = (
  path: RoutePath,
  crumbs: readonly { path: RoutePath; breadcrumb: BreadcrumbFn }[],
): TrailMark[] =>
  crumbs
    .filter(crumb => startsWithPath(path, crumb.path))
    .sort((a, b) => a.path.length - b.path.length)
    .map(crumb => ({ breadcrumb: crumb.breadcrumb, depth: crumb.path.length }));

const assertGuarded = (routes: readonly CompiledRoute[], guard: RouteTable['guard']): void => {
  const gated = routes.find(route => route.permission !== undefined);
  if (gated && !guard) {
    throw new Error(
      `"${joinPath(gated.path)}" declares a \`permission\`, but no extension gives an access policy.`,
    );
  }
};

const assertUnique = (routes: readonly CompiledRoute[]): void => {
  const seen = new Set<string>();
  for (const { path } of routes) {
    const key = pathKey(path);
    if (seen.has(key)) throw new Error(`Two mounts declare a page on "${joinPath(path)}".`);
    seen.add(key);
  }
};

/**
 * Turns the route declarations into the flat table the router matches against.
 *
 * 1. `flattenModuleRoutes` unfolds each module's tree and merges what several
 *    modules — and the mounts, for their crumbs — declare on one path.
 * 2. `placeInMount` gives each route its full path from the root.
 * 3. Each page or redirect becomes a `CompiledRoute`, with the layout and the
 *    wrappers of its mount and the crumbs of its `trailOf`.
 * 4. The routes are sorted `bySpecificity`, so the first match is the right one.
 *
 * It throws on a declaration that cannot be routed, so a mistake fails at startup
 * and in the tests rather than on the page.
 */
export const compileRoutes = ({
  mounts,
  modules,
  fallback,
  shell,
  guard,
}: AppRouterConfig): RouteTable => {
  const declared = mergeSamePath([...mountCrumbs(mounts), ...flattenModuleRoutes(modules)]).map(
    route => placeInMount(route, mounts),
  );
  const crumbs = declared.flatMap(({ path, breadcrumb }) =>
    breadcrumb ? [{ path, breadcrumb }] : [],
  );

  const routes: CompiledRoute[] = declared
    .filter(route => route.page || route.redirect)
    .map(({ mount, path, page, redirect, permission }) => {
      const chain = mountChain(mount, mounts);
      return {
        mount,
        path,
        page,
        redirect,
        permission,
        layout: chain[0].layout,
        shell: chain[0].shell ?? false,
        wrappers: chain.flatMap(definition => (definition.wrapper ? [definition.wrapper] : [])),
        trail: trailOf(path, crumbs),
      };
    })
    .sort((a, b) => bySpecificity(a.path, b.path));

  assertUnique(routes);
  assertGuarded(routes, guard);
  return { routes, fallback, shell, guard };
};
