import type { LucideIcon } from '@scylla/ui';

export interface NavItem {
  title: string;
  /** The URL the link opens, e.g. `/acme/agents`. */
  href: string;
  /** The path of the link in its mount, e.g. `agents`: what `navBadge` and `onNavOpen` receive. */
  url: string;
  icon?: LucideIcon;
  /** Apart from the links before it, in red. */
  danger?: boolean;
  /** Apart from the links before it. */
  apart?: boolean;
  /** A title above this link. It also covers the links after it, up to the next one. */
  heading?: string;
}

/** A folding item with the links of one `NavGroup`, e.g. the agents and the apps. */
export interface NavGroupItem {
  id: string;
  title: string;
  icon?: LucideIcon;
  items: NavItem[];
}

export type NavNode = NavItem | NavGroupItem;

export const isNavGroup = (node: NavNode): node is NavGroupItem => 'items' in node;

export const isNavItemActive = (item: NavItem, pathname: string): boolean =>
  pathname.startsWith(item.href);

export interface NavSection {
  id: string;
  title: string;
  items: NavNode[];
  /** All the links are one item at the end of the rail. */
  railItem?: { icon?: LucideIcon };
  /** The links replace the second sidebar of a rail item. */
  within?: { railItem: string; titleParam: string };
  /** No item on the rail: the second sidebar shows the links while the URL is on one of them. */
  noRailItem?: boolean;
}

/** One item of the rail, and the pages that its second sidebar shows. */
export interface RailItem {
  id: string;
  title: string;
  icon?: LucideIcon;
  /** The id of the group, when the item comes from one. */
  group?: string;
  pages: NavItem[];
}

export interface Rail {
  main: RailItem[];
  end: RailItem[];
  /** The sections with `noRailItem`. They have no row, but the URL can select them. */
  hidden: RailItem[];
}

export interface SecondSidebarContent {
  id: string;
  title: string;
  pages: NavItem[];
}
