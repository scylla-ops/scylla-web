import { describe, it, expect, vi } from 'vitest';
import { flushSync, untrack } from 'svelte';
import {
  animateTile,
  OUT_TO,
  POP_FROM,
  TILE_FADE_IN_MS,
  TILE_OUT_MS,
  TILE_POP,
  TILE_REDUCED_MS,
} from './rail-tile.attachments.svelte.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

/** Puts the tile on a row, the way the template does, and gives a way to change the row. */
const tileOf = (initial: boolean) => {
  const tile = document.createElement('span');
  let active = $state(initial);
  const destroy = $effect.root(() => {
    $effect(() => untrack(() => animateTile(() => active)(tile)));
  });
  flushSync();
  return {
    setActive: (next: boolean) => {
      active = next;
      flushSync();
    },
    destroy,
  };
};

const animate = () => vi.mocked(Element.prototype.animate);

const motions = () =>
  animate().mock.calls.map(([keyframes, options]) => ({
    keyframes: keyframes as PropertyIndexedKeyframes,
    options: options as KeyframeAnimationOptions,
  }));

const scaleOf = (transform: string) => Number(/scale\((.+)\)/.exec(transform)?.[1]);

describe('animateTile', () => {
  it('shows the tile with no motion on the first render', () => {
    tileOf(true);
    tileOf(false);

    expect(animate()).not.toHaveBeenCalled();
  });

  it('pops the tile of the new row from inside the row, a little past its size, then back', () => {
    tileOf(false).setActive(true);

    const [fade, pop] = motions();
    expect(fade).toEqual({
      keyframes: { opacity: [0, 1] },
      options: { duration: TILE_FADE_IN_MS, easing: 'ease-out' },
    });
    const scales = (pop.keyframes.transform as string[]).map(scaleOf);
    expect(scales[0]).toBe(POP_FROM);
    expect(Math.max(...scales)).toBeGreaterThan(1);
    expect(Math.max(...scales)).toBeLessThan(1.05);
    expect(scales.at(-1)).toBe(1);
    expect(pop.options).toEqual({ duration: TILE_POP.duration });
  });

  it('shrinks the tile of the old row while it fades out', () => {
    tileOf(true).setActive(false);

    expect(motions()).toEqual([
      {
        keyframes: { opacity: [1, 0], transform: ['scale(1)', `scale(${OUT_TO})`] },
        options: { duration: TILE_OUT_MS, easing: 'ease-out' },
      },
    ]);
  });

  it('only fades the tile, with no scale, when the user asks for less motion', () => {
    setReducedMotion(true);
    const tile = tileOf(false);

    tile.setActive(true);
    tile.setActive(false);

    expect(motions()).toEqual([
      {
        keyframes: { opacity: [0, 1] },
        options: { duration: TILE_REDUCED_MS, easing: 'ease-out' },
      },
      {
        keyframes: { opacity: [1, 0] },
        options: { duration: TILE_REDUCED_MS, easing: 'ease-out' },
      },
    ]);
  });

  it('stops the motion of the tile when its row changes again, and when it goes away', () => {
    const tile = tileOf(false);

    tile.setActive(true);
    const [fade, pop] = animate().mock.results.map(result => result.value as Animation);
    tile.setActive(false);
    const out = animate().mock.results[2].value as Animation;
    tile.destroy();

    expect([fade.playState, pop.playState, out.playState]).toEqual(['idle', 'idle', 'idle']);
  });
});
