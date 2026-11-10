import type { Component, Snippet } from 'svelte';
import type { MessageDescriptor } from '@lingui/core';
import type { LucideIcon } from '@scylla/ui';
import type { BreadcrumbParams } from '../routing/crumb.struct.ts';
import type { RouteParams } from '../routing/route.struct.ts';
import type { RoutePermission } from './register.struct.ts';

/** How the core checks a route's `permission`. One module of the app provides it. */
export interface AccessPolicy {
  /** Reactive. Hides the sidebar links of the pages that would deny the user. */
  can: (permission: RoutePermission) => boolean;
  /** Reactive. `false` while the permissions load: the sidebar shows placeholders. */
  ready: () => boolean;
  /** Around every page that declares a `permission`. */
  guard: Component<{ permission: RoutePermission; children: Snippet }>;
}

/**
 * A group of sidebar links. The sections show in the order the modules declare them. Each group
 * and each link of a section is one item of the rail, unless `railItem` or `within` says otherwise.
 */
export interface NavSectionDefinition {
  id: string;
  title: MessageDescriptor;
  /** All the links of the section are one item at the end of the rail. */
  railItem?: { icon: LucideIcon };
  /**
   * The links replace the second sidebar of a rail item while the URL fills their parameters.
   * `titleParam` is the breadcrumb parameter with the title, e.g. the name of the open item.
   */
  within?: { railItem: string; titleParam: string };
  /**
   * The section has no item on the rail, and another part of the shell opens it. The second
   * sidebar shows its links while the URL is on one of them.
   */
  noRailItem?: boolean;
}

/** A link that a module makes from data, e.g. one item of a list. */
export interface SecondSidebarLink {
  title: string;
  /** The URL that the link opens. */
  href: string;
  icon?: LucideIcon;
}

/** What a module adds to the core's shell. */
export interface ShellContributions {
  /** Below the sidebar links, e.g. the user menu. */
  sidebarFooter?: readonly Component[];
  /** Above the sidebars, e.g. the logo of the product. The last extension wins. */
  brand?: Component;
  /** At the right end of the top bar, e.g. a context switcher. */
  topBarEnd?: readonly Component[];
  /** Rendered once over the shell, e.g. a dialog. */
  overlays?: readonly Component[];
  /**
   * The height in px of the band at the bottom of the view that an overlay always covers, e.g. a
   * launcher. The frame keeps this band free below its pages. The largest value wins.
   */
  bottomInset?: number;
  /** After the title of every sidebar link. `url` is the link's path in its mount. */
  navBadge?: Component<{ url: string }>;
  /** Called when the user opens a sidebar link. */
  onNavOpen?: (url: string) => void;
  /**
   * Links after the pages of the second sidebar, apart from them, e.g. the items of a list. The
   * sidebar calls it once, when it mounts, thus it can create a query. `shown` is reactive: the
   * id of what the second sidebar shows, a `NavGroup`, a section or the path of a link.
   */
  secondSidebarLinks?: (shown: () => string | undefined) => () => readonly SecondSidebarLink[];
  /** Reactive. Values for the breadcrumbs, in addition to the route parameters. */
  breadcrumbParams?: () => BreadcrumbParams;
  /** Reactive. Parameters of the mount paths in sidebar links, in addition to the route's. */
  linkParams?: () => RouteParams;
}

/** Every query and mutation error goes here. Do not add an `onError` toast in a query. */
export type QueryErrorHandler = (
  error: unknown,
  source: 'query' | 'mutation',
  /**
   * `showsOwnError`: the page shows this error, from `meta` of the query or the mutation.
   * `repeated`: the last fetch of this query failed too, so the user was told already.
   */
  options?: { showsOwnError?: true; repeated?: true },
) => void;

/** Whether a failing query should retry again. `false` vetoes it; `true`/`undefined` keeps the default (3 attempts). */
export type QueryRetryPolicy = (failureCount: number, error: unknown) => boolean | undefined;
