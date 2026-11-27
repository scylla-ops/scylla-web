import { getContext, setContext, type Snippet } from 'svelte';

/** A second screen: its title, beside Back, and its content. */
export interface Screen {
  readonly title: string;
  /** Before the title, e.g. a preview of 32 px of what the screen changes. */
  readonly leading?: Snippet;
  readonly content: Snippet;
}

/** The screen that shows in a `ScreenStack`: `null` for its main screen. */
export interface ScreenStackState {
  readonly screen: Screen | null;
  /** Shows the screen. `from` takes the focus again at Back: the button that opened it. */
  open(screen: Screen, from?: HTMLElement | null): void;
  /** Goes back to the main screen, and gives the focus back to the button that opened the screen. */
  back(): void;
  /** Takes the screen away with no focus move, when its owner goes away. Another screen stays. */
  close(screen: Screen): void;
}

const SCREEN_STACK = Symbol('screen-stack');

export const setScreenStack = (stack: ScreenStackState): ScreenStackState =>
  setContext(SCREEN_STACK, stack);

/** The `ScreenStack` around the caller, if there is one. Call it when the component starts. */
export const getScreenStack = (): ScreenStackState | undefined =>
  getContext<ScreenStackState | undefined>(SCREEN_STACK);
