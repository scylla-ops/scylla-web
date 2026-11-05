import type { NavLink, RouteMount, RoutePermission, RouteSource } from '@scylla/core-sdk';
import { flattenModuleRoutes } from './flatten-routes.ts';
import type { RoutePath } from './route-path.ts';

export interface NavEntry extends NavLink {
  mount: RouteMount;
  /** Relative to the mount, e.g. `agents`. */
  url: string;
  /** From the root, e.g. `[':workspaceSlug', 'agents']`. Its parameters are filled at render. */
  pattern: RoutePath;
  /** The permission of the page. The link hides when the page would deny the user. */
  permission?: RoutePermission;
}

/**
 * Every sidebar link the modules declare, sorted by `order`, then by
 * registration order.
 *
 * A link takes its URL and its permission from its route, so a link can never
 * show for a page that would deny the user. A page that shows its own text to a
 * person with no access names the permission of its link.
 */
export const navEntriesFor = (
  modules: readonly RouteSource[],
  mountPath: (mount: RouteMount) => RoutePath,
): NavEntry[] =>
  flattenModuleRoutes(modules)
    .filter(route => route.nav)
    .map(({ mount, path, nav, permission }) => ({
      ...(nav as NavLink),
      mount,
      url: path.join('/'),
      pattern: [...mountPath(mount), ...path],
      permission: (nav as NavLink).permission ?? permission,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
