import type { Component } from 'svelte';
import type { LucideIcon } from '@scylla/ui';

export interface NavItem {
  title: string;
  /** The URL the link opens, e.g. `/acme/agents`. */
  href: string;
  /** The path of the link in its mount, e.g. `agents`: what `navBadge` and `onNavOpen` receive. */
  url: string;
  icon?: LucideIcon;
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

export interface NavSection {
  id: string;
  title: string;
  items: NavNode[];
  /** Replaces the section label, e.g. a context selector. */
  header?: Component;
}
