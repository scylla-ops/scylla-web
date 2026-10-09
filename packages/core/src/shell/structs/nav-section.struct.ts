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

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
  /** Replaces the section label, e.g. a context selector. */
  header?: Component;
}
