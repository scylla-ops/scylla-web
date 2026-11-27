import { FOLD_MS, UNFOLD_MS } from './fold.ts';

/**
 * One move of the height of a box: a cubic curve from `from` to `to` in `duration`. The slopes
 * are in pixels for the whole duration: a box that grows starts at `3 × distance` and ends at 0
 * (`cubicOut`, as `unfold`), a box that shrinks starts at 0 and ends at `3 × distance`
 * (`cubicIn`, as `fold`). Inside these limits the curve never goes past `to`.
 */
export interface HeightMove {
  from: number;
  to: number;
  /** In milliseconds, on the clock of `requestAnimationFrame`. */
  start: number;
  duration: number;
  startSlope: number;
  endSlope: number;
}

const grows = (from: number, to: number) => to >= from;

/** A new move from rest: the time and the easing of `unfold` to grow, of `fold` to shrink. */
export const heightMove = (from: number, to: number, start: number): HeightMove => {
  const distance = to - from;
  return grows(from, to)
    ? { from, to, start, duration: UNFOLD_MS, startSlope: 3 * distance, endSlope: 0 }
    : { from, to, start, duration: FOLD_MS, startSlope: 0, endSlope: 3 * distance };
};

const progressOf = (move: HeightMove, now: number) =>
  Math.min(1, Math.max(0, (now - move.start) / move.duration));

/** The height of the box at `now`. */
export const heightAt = (move: HeightMove, now: number): number => {
  const t = progressOf(move, now);
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * move.from +
    (t3 - 2 * t2 + t) * move.startSlope +
    (-2 * t3 + 3 * t2) * move.to +
    (t3 - t2) * move.endSlope
  );
};

/** The speed of the box at `now`, in pixels for each millisecond. */
const speedAt = (move: HeightMove, now: number): number => {
  const t = progressOf(move, now);
  if (t >= 1) return 0;
  const t2 = t * t;
  const slope =
    (6 * t2 - 6 * t) * move.from +
    (3 * t2 - 4 * t + 1) * move.startSlope +
    (-6 * t2 + 6 * t) * move.to +
    (3 * t2 - 2 * t) * move.endSlope;
  return slope / move.duration;
};

export const moveEnded = (move: HeightMove, now: number): boolean => progressOf(move, now) >= 1;

/**
 * The same move to a new end, from the place and at the speed of the box at `now`: the content
 * grew while the box moved. The new move takes the full time again, thus a late change does not
 * jump. It keeps the speed only in the direction of the new end, and never more than the speed
 * that would go past it; a move back starts as a new move.
 */
export const retarget = (move: HeightMove, to: number, now: number): HeightMove => {
  const from = heightAt(move, now);
  const next = heightMove(from, to, now);
  const distance = to - from;
  const speed = speedAt(move, now) * next.duration;
  if (distance === 0 || Math.sign(speed) !== Math.sign(distance)) return next;
  const startSlope = Math.sign(distance) * Math.min(Math.abs(speed), 3 * Math.abs(distance));
  return { ...next, startSlope };
};
