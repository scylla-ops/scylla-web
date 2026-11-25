import { vi } from 'vitest';
import { setAppNavigator, type RouteShare } from '@scylla/core-sdk';

/**
 * A fake navigator, installed in place of the router. `navigate(to)` without
 * options records an explicit `undefined`. The query string follows a write, the
 * pathname does not: a path navigation unmounts the caller in the app.
 */
export const installTestNavigator = (
  options: {
    pathname?: string;
    search?: string;
    params?: Record<string, string>;
    /** The `share` of the current page. */
    share?: RouteShare;
  } = {},
) => {
  const pathname = options.pathname ?? '/';
  let search = options.search ?? '';

  const navigate = vi.fn((to: string) => {
    const index = to.indexOf('?');
    search = index === -1 ? '' : to.slice(index);
  });
  const back = vi.fn();
  const pages = new Set<string>();

  setAppNavigator({
    navigate,
    back,
    pathname: () => pathname,
    search: () => search,
    params: () => options.params ?? {},
    trail: () => [],
    hasPage: pathname => pages.has(pathname),
    share: () => options.share,
  });

  return {
    navigate,
    back,
    /** The pathnames that have a page. */
    pages,
    restore: () => setAppNavigator(null),
  };
};
