import type { Component } from 'svelte';
import type { MessageDescriptor } from '@lingui/core';
import type { LucideIcon } from '@scylla/ui';
import type {
  AccessPolicy,
  NavSectionDefinition,
  QueryErrorHandler,
  ShellContributions,
} from '../extension/contributions.struct.ts';
import type { QueryRetryPolicy } from '../extension/contributions.struct.ts';
import type { CommandDefinition } from '../extension/command.struct.ts';
import type { RoutePermission } from '../extension/register.struct.ts';
import type { WidgetPoint } from '../widgets/widget-points.struct.ts';
import type { BreadcrumbFn } from './crumb.struct.ts';
import type { MountDefinition } from './mount.struct.ts';
import type { RouteMount, RouteParams } from './route.struct.ts';

export type { RouteMount, RouteParams };

export type PageComponent = Component<RouteParams> | Component<Record<string, never>>;

/** Write it `() => import('./X.page.svelte')`: the page keeps its own chunk. */
export type PageLoader = () => Promise<{ default: PageComponent }>;

/** Its URL and its permission are the route's. */
export interface NavLink {
  /** The id of a nav section that an extension declares. */
  section: string;
  title: MessageDescriptor;
  icon?: LucideIcon;
  order?: number;
  /** The links of one group fold under one item of their section, at the place of the first. */
  group?: NavGroup;
  /** For a page that shows its own text to a person with no access: the link hides for them. */
  permission?: RoutePermission;
  /** The value of a parameter of the route. A route with a list of links has one per value. */
  params?: RouteParams;
  /** Apart from the links before it, in red. */
  danger?: boolean;
  /** Other words that find this page in the command bar, in one text. */
  keywords?: MessageDescriptor;
}

/** A folding item of a nav section. The links that name the same `id` go under it. */
export interface NavGroup {
  id: string;
  title: MessageDescriptor;
  icon?: LucideIcon;
}

/** A route with only `path` and `children` groups them; a child without `path` is its parent's page. */
export interface ModuleRoute {
  /** Relative to the parent route or to the mount. May hold several segments. */
  path?: string;
  /** Keep it lazy. */
  page?: PageLoader;
  /** A relative target starts from this route's URL. */
  redirect?: string;
  /** Read by the route guard and the sidebar. Guards this page only: children declare their own. */
  permission?: RoutePermission;
  /** Shows on this page and on every page below its path. */
  breadcrumb?: BreadcrumbFn;
  /** A sidebar link to this page, or one link per value of a parameter (`NavLink.params`). */
  nav?: NavLink | readonly NavLink[];
  /**
   * The params whose change stays inside the page, e.g. the section of a page of tabs: a new
   * value keeps the page mounted, with no transition. The page reads them with `routeParams()`.
   * Any other change of the URL mounts the page again.
   */
  inPageParams?: readonly string[];
  children?: readonly ModuleRoute[];
}

export type ModuleRoutes = Readonly<Record<RouteMount, readonly ModuleRoute[]>>;

/**
 * Declared in `<feature>.module.ts`, never exported from the module's `index.ts`.
 * A feature module declares `domain` and `routes`. The other fields build the
 * app around the pages: most apps have them in one module (scylla-base: `ShellModule`).
 */
export interface ScyllaModule<TDomain extends object = object> {
  /** Unique across all extensions: the DI registry is keyed by it. */
  readonly id: string;
  readonly domain: TDomain;
  readonly routes?: ModuleRoutes;
  /**
   * The widget points this module opens (`<feature>.points.ts`). The loader names each one
   * `<module id>.<key>`, and finds its owner here: a point no module lists cannot be changed.
   */
  readonly points?: Readonly<Record<string, WidgetPoint>>;
  /** What this module adds to the command bar, in addition to the sidebar links of its routes. */
  readonly commands?: readonly CommandDefinition[];
  /** The mounts that routes graft on. Each mount is declared once in the app. */
  readonly mounts?: Readonly<Record<RouteMount, MountDefinition>>;
  /** The sections that sidebar links name in `nav.section`. */
  readonly navSections?: readonly NavSectionDefinition[];
  /** At most one module in the app. */
  readonly access?: AccessPolicy;
  readonly shell?: ShellContributions;
  readonly onQueryError?: QueryErrorHandler;
  readonly onQueryRetry?: QueryRetryPolicy;
  /** The page when no route matches. Exactly one module in the app. */
  readonly fallback?: Component;
}

/** What the router reads of a module. */
export type RouteSource = Pick<ScyllaModule, 'id' | 'routes'>;
