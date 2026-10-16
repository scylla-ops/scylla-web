/** Shared with `CountingInjected.fixture.svelte`: how many times it mounted and cleaned up. */
export const counts = { mounts: 0, cleanups: 0 };

export const resetCounts = (): void => {
  counts.mounts = 0;
  counts.cleanups = 0;
};

/** The Svelte context that `WidgetZone.fixture.svelte` sets and `ContextReader.fixture.svelte` reads. */
export const OWNER_CONTEXT_KEY = Symbol('owner');
