/** The navigation of the core, beside the Scylla helpers that build on it (`scyllaNavigate`). */
export {
  currentPathname,
  currentSearch,
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
} from './resource-error.svelte.ts';
export { contextStore } from './context.store.ts';
export { scyllaNavigate, type ScyllaNavigate } from './scylla-navigate.ts';
