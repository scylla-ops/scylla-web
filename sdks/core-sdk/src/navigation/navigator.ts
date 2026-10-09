import type { TrailCrumb } from '../routing/crumb.struct.ts';
import type { RouteParams } from '../routing/route.struct.ts';

/** The only way to change the URL. The core installs the router with `setAppNavigator`. */

export interface NavigateOptions {
  replace?: boolean;
}

export interface AppNavigator {
  navigate: (to: string, options?: NavigateOptions) => void;
  back: () => void;
  /** Reactive. */
  pathname: () => string;
  /** With its leading `?`. */
  search: () => string;
  /** Reactive. The parameters of the current route. */
  params: () => RouteParams;
  /** Reactive. The crumbs of the current route, from the root. */
  trail: () => TrailCrumb[];
}

let current: AppNavigator | null = null;

/** `null` uninstalls it (tests). */
export const setAppNavigator = (navigator: AppNavigator | null): void => {
  current = navigator;
};

const require = (): AppNavigator => {
  // Throw: a navigation that silently does nothing can only be a wiring mistake.
  if (!current) {
    throw new Error('No navigator installed — the core must call setAppNavigator() first.');
  }
  return current;
};

export const navigateTo = (to: string, options?: NavigateOptions): void =>
  require().navigate(to, options);

export const navigateBack = (): void => require().back();

/** Falls back to `window.location` when no router is installed, as in a component test. */
export const currentPathname = (): string =>
  current ? current.pathname() : window.location.pathname;

export const currentSearch = (): string =>
  current ? current.search() : window.location.search;

/** Reactive once the router is installed. */
export const routePathname = currentPathname;

/** Reactive. Empty when no router is installed. */
export const routeParams = (): RouteParams => current?.params() ?? {};

/** Reactive. Empty when no router is installed. */
export const routeTrail = (): TrailCrumb[] => current?.trail() ?? [];
