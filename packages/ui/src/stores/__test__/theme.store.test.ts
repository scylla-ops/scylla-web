import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTheme,
  getThemePreference,
  setThemePreference,
  subscribeToTheme,
} from '../theme.store.ts';

const mediaQueries = (
  matching: Record<string, boolean>,
  onChange?: (listener: () => void) => void,
) =>
  vi.fn().mockImplementation((query: string) => ({
    matches: matching[query] ?? false,
    media: query,
    addEventListener: (_type: string, listener: () => void) => onChange?.(listener),
    removeEventListener: vi.fn(),
  }));

const DARK = '(prefers-color-scheme: dark)';
const REDUCED = '(prefers-reduced-motion: reduce)';

/** A View Transitions API that runs the update at once and is ready right away. */
const stubViewTransitions = () => {
  const start = vi.fn((update: () => void) => {
    update();
    return { ready: Promise.resolve() };
  });
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
  return start;
};

beforeEach(() => {
  setThemePreference('dark');
  localStorage.clear();
});

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
});

describe('theme store', () => {
  it('puts the class on <html>, which is what every `dark:` utility reads', () => {
    setThemePreference('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    setThemePreference('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists the choice under the key `index.html` reads before the first paint', () => {
    setThemePreference('light');
    expect(localStorage.getItem('scylla-theme')).toBe('light');

    setThemePreference('system');
    expect(localStorage.getItem('scylla-theme')).toBe('system');
  });

  it('notifies subscribers on a change', () => {
    const listener = vi.fn();
    subscribeToTheme(listener);

    setThemePreference('light');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getTheme()).toBe('light');
  });

  it('stays silent when the choice is the one already applied', () => {
    const listener = vi.fn();
    subscribeToTheme(listener);

    setThemePreference('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying once unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToTheme(listener);

    unsubscribe();
    setThemePreference('light');

    expect(listener).not.toHaveBeenCalled();
  });

  it('leaves no transition-killing style behind once the swap is done', () => {
    setThemePreference('light');

    // The <style> exists only for the frame the class swap takes; a leaked one
    // would freeze every transition in the app.
    expect(document.head.querySelector('style')).toBeNull();
  });

  it('resolves `system` with the color scheme of the OS', () => {
    window.matchMedia = mediaQueries({ [DARK]: false });
    setThemePreference('system');
    expect(getTheme()).toBe('light');
    expect(getThemePreference()).toBe('system');

    setThemePreference('dark');
    window.matchMedia = mediaQueries({ [DARK]: true });
    setThemePreference('system');
    expect(getTheme()).toBe('dark');
  });

  it('tells the picker about a new choice that keeps the same theme on screen', () => {
    window.matchMedia = mediaQueries({ [DARK]: true });
    const listener = vi.fn();
    subscribeToTheme(listener);

    setThemePreference('system');

    expect(getTheme()).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('spreads the new theme from the origin as one circle that reaches the farthest corner', async () => {
    const start = stubViewTransitions();
    const animate = vi.mocked(Element.prototype.animate);
    animate.mockClear();
    window.innerWidth = 1440;
    window.innerHeight = 900;

    setThemePreference('light', { x: 839, y: 490 });
    await Promise.resolve();

    expect(start).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(animate).toHaveBeenCalledWith(
      {
        clipPath: [
          'circle(0px at 839px 490px)',
          `circle(${Math.hypot(839, 490)}px at 839px 490px)`,
        ],
      },
      expect.objectContaining({ duration: 450, pseudoElement: '::view-transition-new(root)' }),
    );
  });

  it('swaps at once with no origin, or when the user asks for reduced motion', () => {
    const start = stubViewTransitions();

    setThemePreference('light');
    expect(start).not.toHaveBeenCalled();

    window.matchMedia = mediaQueries({ [REDUCED]: true });
    setThemePreference('dark', { x: 10, y: 10 });
    expect(start).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('swaps at once in a browser without the View Transitions API', () => {
    setThemePreference('light', { x: 10, y: 10 });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('ignores a transition that the browser skips', async () => {
    Object.defineProperty(document, 'startViewTransition', {
      value: (update: () => void) => {
        update();
        return { ready: Promise.reject(new Error('skipped')) };
      },
      configurable: true,
    });

    setThemePreference('light', { x: 10, y: 10 });
    await Promise.resolve();

    expect(getTheme()).toBe('light');
  });
});

describe('theme store at start-up', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('reads back the stored choice, and treats no value as dark', async () => {
    localStorage.setItem('scylla-theme', 'system');
    vi.resetModules();
    expect((await import('../theme.store.ts')).getThemePreference()).toBe('system');

    localStorage.removeItem('scylla-theme');
    vi.resetModules();
    expect((await import('../theme.store.ts')).getThemePreference()).toBe('dark');
  });

  it('follows the OS when its color scheme changes while the choice is `system`', async () => {
    let osChanged: () => void = () => undefined;
    const matching = { [DARK]: false };
    window.matchMedia = mediaQueries(matching, listener => (osChanged = listener));
    vi.resetModules();
    const store = await import('../theme.store.ts');

    store.setThemePreference('system');
    expect(store.getTheme()).toBe('light');

    matching[DARK] = true;
    osChanged();
    expect(store.getTheme()).toBe('dark');

    store.setThemePreference('light');
    matching[DARK] = true;
    osChanged();
    expect(store.getTheme()).toBe('light');
  });
});
