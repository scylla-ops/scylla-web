import { describe, it, expect, vi, afterEach } from 'vitest';
import { FOLD_MS, UNFOLD_MS, fold, unfold } from '../fold.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

afterEach(() => vi.restoreAllMocks());

describe('fold and unfold', () => {
  it('opens in more time than it closes, with the height and a fade', () => {
    setReducedMotion(false);
    const node = document.createElement('div');

    const opening = unfold(node);
    const closing = fold(node);

    expect(opening.duration).toBe(UNFOLD_MS);
    expect(closing.duration).toBe(FOLD_MS);
    expect(FOLD_MS).toBeLessThan(UNFOLD_MS);
    expect(opening.css?.(0.5, 0.5)).toContain('height');
    expect(opening.css?.(0.5, 0.5)).toMatch(/opacity: 0\.5$/);
  });

  it('is instant for a person who asked for less motion', () => {
    setReducedMotion(true);
    const node = document.createElement('div');

    expect(unfold(node).duration).toBe(0);
    expect(fold(node).duration).toBe(0);
  });
});
