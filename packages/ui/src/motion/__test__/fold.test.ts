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

  it('takes in the gap of its flex column, so the parts around do not jump', () => {
    setReducedMotion(false);
    const column = document.createElement('div');
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.rowGap = '16px';
    const [first, last] = [document.createElement('p'), document.createElement('p')];
    column.append(first, last);
    document.body.append(column);

    expect(unfold(first).css?.(0, 1)).toMatch(/margin-bottom: -16px$/);
    expect(unfold(last).css?.(0, 1)).toMatch(/margin-top: -16px$/);
    expect(fold(last).css?.(1, 0)).toMatch(/margin-top: 0px$/);
    column.remove();
  });

  it('is instant for a person who asked for less motion', () => {
    setReducedMotion(true);
    const node = document.createElement('div');

    expect(unfold(node).duration).toBe(0);
    expect(fold(node).duration).toBe(0);
  });
});
