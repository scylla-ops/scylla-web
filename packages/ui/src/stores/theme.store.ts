import { createSubscriber } from 'svelte/reactivity';
import { prefersReducedMotion } from '../motion/reduced-motion.ts';

/** The theme on screen. */
export type Theme = 'light' | 'dark';

/** The choice of the user: `system` follows the color scheme of the OS. */
export type ThemePreference = Theme | 'system';

/** Where the new theme starts to spread, in viewport pixels. */
export interface ThemeOrigin {
  x: number;
  y: number;
}

/** Shared with the inline script in `index.html`. */
const STORAGE_KEY = 'scylla-theme';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

const WAVE_DURATION_MS = 450;
const WAVE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const hasDocument = typeof document !== 'undefined';

const prefersDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(SYSTEM_DARK_QUERY).matches;

/** No stored value means dark, as in `index.html`. */
const preferenceInStorage = (): ThemePreference => {
  if (typeof localStorage === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'system' ? stored : 'dark';
};

const resolve = (preference: ThemePreference): Theme => {
  if (preference !== 'system') return preference;
  return prefersDark() ? 'dark' : 'light';
};

/**
 * `index.html` sets the class before the first paint: read it back from the DOM.
 * The `document` guard is for the tests that run without jsdom.
 */
const themeInDocument = (): Theme => {
  if (!hasDocument) return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

let preference: ThemePreference = preferenceInStorage();
let current: Theme = themeInDocument();

const listeners = new Set<() => void>();

export const getTheme = (): Theme => current;

export const getThemePreference = (): ThemePreference => preference;

export const subscribeToTheme = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Disables transitions for the frame of the class swap, or every color animates at once. */
const withoutTransitions = (swap: () => void): void => {
  const style = document.createElement('style');
  style.append(document.createTextNode('*,*::before,*::after{transition:none!important}'));
  document.head.appendChild(style);

  swap();

  // Force the reflow, or the browser batches both changes and animates anyway.
  document.body.getBoundingClientRect();

  document.head.removeChild(style);
};

/** The radius that reaches the farthest corner of the viewport from the origin. */
const waveRadius = ({ x, y }: ThemeOrigin): number =>
  Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

/**
 * The new theme spreads from the origin as one circle (`styles.css` turns off the default
 * cross-fade of the view transition). No origin, no View Transitions API or a reduced motion
 * setting: the swap is instant.
 */
const swapWithWave = (swap: () => void, origin?: ThemeOrigin): void => {
  if (!origin || typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    withoutTransitions(swap);
    return;
  }

  const transition = document.startViewTransition(() => withoutTransitions(swap));
  const at = `at ${origin.x}px ${origin.y}px`;
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px ${at})`, `circle(${waveRadius(origin)}px ${at})`] },
        {
          duration: WAVE_DURATION_MS,
          easing: WAVE_EASING,
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    // The browser skips the transition when the page is hidden: the swap is already done.
    .catch(() => undefined);
};

const apply = (theme: Theme, origin?: ThemeOrigin): void => {
  if (theme === current) return;

  current = theme;

  const notify = () => listeners.forEach(listener => listener());

  if (!hasDocument) {
    notify();
    return;
  }

  swapWithWave(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    notify();
  }, origin);
};

/** Stores the choice for this device and applies it, from `origin` when one is given. */
export const setThemePreference = (next: ThemePreference, origin?: ThemeOrigin): void => {
  const changed = next !== preference;
  preference = next;

  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);

  const before = current;
  apply(resolve(next), origin);

  // A change between two choices that resolve to the same theme still has to reach the picker.
  if (changed && current === before) listeners.forEach(listener => listener());
};

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia(SYSTEM_DARK_QUERY).addEventListener('change', () => {
    if (preference === 'system') apply(resolve('system'));
  });
}

const trackTheme = createSubscriber(update => subscribeToTheme(update));

/** Reactive. */
export const currentTheme = (): Theme => {
  trackTheme();
  return current;
};

/** Reactive. */
export const currentThemePreference = (): ThemePreference => {
  trackTheme();
  return preference;
};
