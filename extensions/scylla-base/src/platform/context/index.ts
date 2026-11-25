/** The navigation of the core, beside the Scylla helpers that build on it (`scyllaNavigate`). */
export {
  currentPathname,
  currentSearch,
  hasPage,
  navigateBack,
  navigateTo,
  setAppNavigator,
  type AppNavigator,
  type NavigateOptions,
} from '@scylla/core-sdk';
export {
  createResourceError,
  type ResourceError,
  type ResourceErrorOptions,
} from './resource-error.state.svelte.ts';
export { contextStore } from './context.store.ts';
export { createSearchParams } from './search-params.state.svelte.ts';
export {
  activeWorkspaceSlug,
  workspaceUrl,
  scyllaHref,
  scyllaNavigate,
  type ScyllaNavigate,
} from './scylla-navigate.ts';
