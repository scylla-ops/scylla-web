import { createStore } from './create-store.ts';

/**
 * While `held`, a `ScyllaDialog` takes no Escape or outside click and hides its close controls.
 * `onBlocked` tells the holder that a dismiss was refused, so that it can ask what to do.
 */
export const dialogHoldStore = createStore<{ held: boolean; onBlocked?: () => void }>(() => ({
  held: false,
}));
