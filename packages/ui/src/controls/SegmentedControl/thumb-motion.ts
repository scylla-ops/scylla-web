import { cubicOut } from 'svelte/easing';
import { springEasing } from '../../motion/spring.ts';

/** A box in the track, in pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type ThumbMove = 'stretch' | 'settle';

export const STRETCH_MS = 80;
/** How far each edge goes during the stretch: the leading edge first. */
export const TRAILING_REACH = 0.15;
export const LEADING_REACH = 0.7;
export const SETTLE = { bounce: 0.2, duration: 300 };
export const REDUCED_MS = 150;

const FRAME_MS = 1000 / 60;

const edgesOf = (box: Box): Edges => ({
  left: box.x,
  right: box.x + box.width,
  top: box.y,
  bottom: box.y + box.height,
});

const mix = (from: Edges, to: Edges, reach: Edges): Edges => ({
  left: from.left + (to.left - from.left) * reach.left,
  right: from.right + (to.right - from.right) * reach.right,
  top: from.top + (to.top - from.top) * reach.top,
  bottom: from.bottom + (to.bottom - from.bottom) * reach.bottom,
});

const all = (value: number): Edges => ({ left: value, right: value, top: value, bottom: value });

const frame = (edges: Edges, offset: number): Keyframe => ({
  offset,
  left: `${edges.left}px`,
  top: `${edges.top}px`,
  width: `${edges.right - edges.left}px`,
  height: `${edges.bottom - edges.top}px`,
});

/** `count` samples of `ease` from (exclusive) 0 to (inclusive) 1, as edges. */
const samples = (from: Edges, to: Edges, ms: number, ease: (t: number) => number) => {
  const count = Math.max(1, Math.ceil(ms / FRAME_MS));
  return Array.from({ length: count }, (_, i) => mix(from, to, all(ease((i + 1) / count))));
};

/**
 * The keyframes of the thumb from one box to another. `stretch`: the leading edge goes first
 * (the trailing edge to 15 % of the way, the leading edge to 70 %), then both settle on a spring.
 * `settle`: the spring only. With a reduced motion, a short ease-out and no stretch.
 */
export const thumbKeyframes = (
  from: Box,
  to: Box,
  { move, reduced }: { move: ThumbMove; reduced: boolean },
): { keyframes: Keyframe[]; duration: number } => {
  const start = edgesOf(from);
  const end = edgesOf(to);
  if (reduced) {
    const steps = samples(start, end, REDUCED_MS, cubicOut);
    return {
      keyframes: [frame(start, 0), ...steps.map((edges, i) => frame(edges, (i + 1) / steps.length))],
      duration: REDUCED_MS,
    };
  }

  const rightward = end.left + end.right >= start.left + start.right;
  const reach: Edges = {
    left: rightward ? TRAILING_REACH : LEADING_REACH,
    right: rightward ? LEADING_REACH : TRAILING_REACH,
    top: TRAILING_REACH,
    bottom: TRAILING_REACH,
  };
  const stretchMs = move === 'stretch' ? STRETCH_MS : 0;
  const middle = move === 'stretch' ? mix(start, end, reach) : start;
  const duration = stretchMs + SETTLE.duration;

  const stretch = stretchMs ? samples(start, middle, stretchMs, cubicOut) : [];
  const settle = samples(middle, end, SETTLE.duration, springEasing(SETTLE));
  const times = [
    ...stretch.map((_, i) => ((i + 1) / stretch.length) * stretchMs),
    ...settle.map((_, i) => stretchMs + ((i + 1) / settle.length) * SETTLE.duration),
  ];
  return {
    keyframes: [
      frame(start, 0),
      ...[...stretch, ...settle].map((edges, i) => frame(edges, times[i] / duration)),
    ],
    duration,
  };
};
