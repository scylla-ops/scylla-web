import type { Component, Snippet } from 'svelte';
import type { BreadcrumbFn } from './crumb.struct.ts';
import type { RouteMount, RouteParams } from './route.struct.ts';

export type LayoutComponent = Component<{ children: Snippet }>;

/** Around every page of a mount, e.g. to sync the URL with a store. */
export type RouteWrapper = Component<{ params: RouteParams; children: Snippet }>;

export interface MountDefinition {
  /** Without a parent, the mount starts at `/`. */
  parent?: RouteMount;
  path?: string;
  /** Only on a root mount. Its pages render inside the core's shell (sidebar, top bar), and animate. */
  shell?: boolean;
  /** Only on a root mount. Around the shell, e.g. an authentication gate. Its pages animate. */
  layout?: LayoutComponent;
  /** Inside the wrappers of the parent mounts. */
  wrapper?: RouteWrapper;
  breadcrumb?: BreadcrumbFn;
}
