import { describe, it, expect, vi, afterEach } from 'vitest';
import { SCREEN_BEHIND_CLASS, SCREEN_MS, screenIn, screenOut } from '../screen-slide.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

afterEach(() => vi.restoreAllMocks());

describe('screenIn and screenOut', () => {
  it('slides the second screen in from the end side, and out the same way', () => {
    setReducedMotion(false);

    expect(screenIn().duration).toBe(SCREEN_MS);
    expect(screenOut().duration).toBe(SCREEN_MS);
    expect(screenIn().css?.(0, 1)).toBe('opacity: 0; transform: translateX(100%)');
    expect(screenIn().css?.(1, 0)).toBe('opacity: 1; transform: translateX(0%)');
    expect(screenOut().css?.(0, 1)).toBe('opacity: 0; transform: translateX(100%)');
  });

  it('moves the first screen in the same time as the second one', () => {
    expect(SCREEN_BEHIND_CLASS).toContain(`duration-${SCREEN_MS}`);
    expect(SCREEN_BEHIND_CLASS).toContain('motion-reduce:transition-none');
  });

  it('is instant for a person who asked for less motion', () => {
    setReducedMotion(true);

    expect(screenIn().duration).toBe(0);
    expect(screenOut().duration).toBe(0);
  });
});
