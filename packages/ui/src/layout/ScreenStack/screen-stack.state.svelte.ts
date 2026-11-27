import { tick } from 'svelte';
import type { Screen, ScreenStackState } from './screen-stack.ts';

/** Which screen a `ScreenStack` shows, and the button that takes the focus again at Back. */
export const createScreenStack = (): ScreenStackState => {
  let screen = $state.raw<Screen | null>(null);
  let opener: HTMLElement | null = null;

  return {
    get screen() {
      return screen;
    },
    open(next, from) {
      opener = from ?? null;
      screen = next;
    },
    back() {
      if (!screen) return;
      screen = null;
      const to = opener;
      opener = null;
      // The main screen is no longer inert after the update.
      void tick().then(() => to?.focus({ preventScroll: true }));
    },
    close(owned) {
      if (screen !== owned) return;
      screen = null;
      opener = null;
    },
  };
};
