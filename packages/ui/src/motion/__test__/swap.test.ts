import { describe, it, expect, vi, afterEach } from 'vitest';
import { SWAP_IN, SWAP_OUT_MS, swapIn, swapOut } from '../swap.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

afterEach(() => vi.restoreAllMocks());

describe('swapIn and swapOut', () => {
  it('fades the old value out faster than the new value grows in', () => {
    setReducedMotion(false);

    expect(swapIn().duration).toBe(SWAP_IN.duration);
    expect(swapOut().duration).toBe(SWAP_OUT_MS);
    expect(SWAP_OUT_MS).toBeLessThan(SWAP_IN.duration);
    expect(swapIn().css?.(0, 1)).toBe('opacity: 0; transform: scale(0.85)');
    expect(swapIn().css?.(1, 0)).toBe('opacity: 1; transform: scale(1)');
    expect(swapOut().css?.(1, 0)).toBe('opacity: 1; transform: scale(1)');
  });

  it('is instant for a person who asked for less motion', () => {
    setReducedMotion(true);

    expect(swapIn().duration).toBe(0);
    expect(swapOut().duration).toBe(0);
  });
});
