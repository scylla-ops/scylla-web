import type { ChartTone } from '../chart-tone.ts';

/** One arc of a ring: a value of the same unit as the total. */
export interface ChartRingArc {
  value: number;
  tone: ChartTone;
}

/** Where an arc goes on the ring, in percent of the circle, from the top, clockwise. */
export interface RingArcGeometry {
  tone: ChartTone;
  start: number;
  length: number;
}

/** A ring shows at most this number of arcs. */
export const RING_MAX_ARCS = 3;

/** The space after each arc when the ring shows more than one, in percent of the circle. */
export const RING_ARC_GAP = 1.5;

/** The length that a value above 0 keeps, so that a very small part stays visible. */
export const RING_MIN_ARC = 0.5;

/**
 * Places the arcs on the circle. The arcs fill the share of `total` that they hold. When their
 * sum is more than `total`, the sum is the scale. An arc of 0 or less does not show.
 */
export const ringArcs = (
  arcs: readonly ChartRingArc[],
  total: number,
  gap: number = RING_ARC_GAP,
): RingArcGeometry[] => {
  const shown = arcs.slice(0, RING_MAX_ARCS).filter(arc => arc.value > 0);
  const sum = shown.reduce((acc, arc) => acc + arc.value, 0);
  const scale = Math.max(total, sum);
  if (scale <= 0) return [];

  const space = shown.length > 1 ? gap : 0;
  let start = 0;
  return shown.map(arc => {
    const share = (arc.value / scale) * 100;
    const geometry = { tone: arc.tone, start, length: Math.max(share - space, RING_MIN_ARC) };
    start += share;
    return geometry;
  });
};
