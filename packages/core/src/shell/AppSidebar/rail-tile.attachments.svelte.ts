import { untrack } from 'svelte';
import { prefersReducedMotion, springEasing } from '@scylla/ui';

export const TILE_FADE_IN_MS = 100;
export const TILE_POP = { bounce: 0.4, duration: 500 };
export const TILE_OUT_MS = 160;
export const TILE_REDUCED_MS = 150;
/** On the closed rail, the new tile starts at 18 px of 32, and the old tile goes out at 24 px. */
export const POP_FROM = 0.5625;
export const OUT_TO = 0.75;

const EASE_OUT = 'ease-out';
const FRAME_MS = 1000 / 60;

interface TileMotion {
  keyframes: PropertyIndexedKeyframes;
  options: KeyframeAnimationOptions;
}

const scale = (value: number) => `scale(${value})`;

const popScales = (): string[] => {
  const ease = springEasing(TILE_POP);
  const count = Math.ceil(TILE_POP.duration / FRAME_MS);
  return Array.from({ length: count + 1 }, (_, i) =>
    scale(POP_FROM + (1 - POP_FROM) * ease(i / count)),
  );
};

const tileMotions = (active: boolean, reduced: boolean): TileMotion[] => {
  if (reduced) {
    return [
      {
        keyframes: { opacity: active ? [0, 1] : [1, 0] },
        options: { duration: TILE_REDUCED_MS, easing: EASE_OUT },
      },
    ];
  }
  if (!active) {
    return [
      {
        keyframes: { opacity: [1, 0], transform: [scale(1), scale(OUT_TO)] },
        options: { duration: TILE_OUT_MS, easing: EASE_OUT },
      },
    ];
  }
  return [
    { keyframes: { opacity: [0, 1] }, options: { duration: TILE_FADE_IN_MS, easing: EASE_OUT } },
    { keyframes: { transform: popScales() }, options: { duration: TILE_POP.duration } },
  ];
};

/**
 * The tile of a rail row pops in on a spring when its row becomes active, and shrinks out when
 * its row stops being active. The class of the tile gives the end state, thus the first render
 * shows it with no motion.
 */
export const animateTile = (active: () => boolean) => (tile: HTMLElement) => {
  let shown = untrack(active);
  let running: Animation[] = [];
  const stop = () => running.forEach(animation => animation.cancel());

  $effect(() => {
    const next = active();
    if (next === shown) return;
    shown = next;
    stop();
    running = tileMotions(next, prefersReducedMotion()).map(({ keyframes, options }) =>
      tile.animate(keyframes, options),
    );
  });

  return stop;
};
