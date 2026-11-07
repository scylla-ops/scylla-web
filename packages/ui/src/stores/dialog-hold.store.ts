import { createStore } from './create-store.ts';

/** While `held`, a `ScyllaDialog` takes no Escape or outside click and hides its close controls. */
export const dialogHoldStore = createStore<{ held: boolean }>(() => ({ held: false }));
