// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { cubicIn, cubicOut } from 'svelte/easing';
import { FOLD_MS, UNFOLD_MS } from '../fold.ts';
import { heightAt, heightMove, moveEnded, retarget, type HeightMove } from '../height-move.ts';

const STEP_MS = 4;

/** The heights of a move from `at` to its end, one each `STEP_MS`. */
const path = (move: HeightMove, at = move.start) => {
  const heights: number[] = [];
  for (let now = at; now <= move.start + move.duration; now += STEP_MS) {
    heights.push(heightAt(move, now));
  }
  return heights;
};

const isMonotonic = (heights: number[], up: boolean) =>
  heights.every(
    (height, index) =>
      index === 0 ||
      (up ? height >= heights[index - 1] : height <= heights[index - 1]) ||
      Math.abs(height - heights[index - 1]) < 1e-9,
  );

describe('the move of the height of a box', () => {
  it('grows as unfold and shrinks as fold', () => {
    const grow = heightMove(40, 240, 1000);
    const shrink = heightMove(240, 40, 1000);

    expect(grow.duration).toBe(UNFOLD_MS);
    expect(shrink.duration).toBe(FOLD_MS);
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(heightAt(grow, 1000 + t * UNFOLD_MS)).toBeCloseTo(40 + 200 * cubicOut(t), 6);
      expect(heightAt(shrink, 1000 + t * FOLD_MS)).toBeCloseTo(240 - 200 * cubicIn(t), 6);
    }
    expect(moveEnded(grow, 1000 + UNFOLD_MS - 1)).toBe(false);
    expect(moveEnded(grow, 1000 + UNFOLD_MS)).toBe(true);
    expect(heightAt(grow, 5000)).toBe(240);
  });

  it('takes a new end from the place and the speed of the box: no jump, no stop', () => {
    const move = heightMove(40, 240, 0);
    const now = UNFOLD_MS / 2;

    const next = retarget(move, 305, now);

    expect(heightAt(next, now)).toBeCloseTo(heightAt(move, now), 9);
    const before = (heightAt(move, now) - heightAt(move, now - 1)) / 1;
    const after = (heightAt(next, now + 1) - heightAt(next, now)) / 1;
    expect(after).toBeCloseTo(before, 1);
    expect(next.duration).toBe(UNFOLD_MS);
    expect(heightAt(next, now + UNFOLD_MS)).toBe(305);
  });

  it('never goes past its end, also after new ends late in the move', () => {
    for (const late of [0.05, 0.3, 0.6, 0.95]) {
      for (const to of [241, 260, 305, 600]) {
        const move = heightMove(40, 240, 0);
        const now = late * UNFOLD_MS;
        const next = retarget(move, to, now);
        const heights = path(next, now);

        expect(isMonotonic(heights, true)).toBe(true);
        expect(Math.max(...heights)).toBeLessThanOrEqual(to + 1e-9);
      }
    }
    const shrink = heightMove(240, 40, 0);
    const shorter = retarget(shrink, 0, FOLD_MS / 2);
    const heights = path(shorter, FOLD_MS / 2);
    expect(isMonotonic(heights, false)).toBe(true);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(-1e-9);
  });

  it('starts a move back as a new move, from the place of the box', () => {
    const open = heightMove(40, 240, 0);
    const now = UNFOLD_MS / 2;

    const back = retarget(open, 40, now);

    expect(back).toEqual(heightMove(heightAt(open, now), 40, now));
    expect(isMonotonic(path(back, now), false)).toBe(true);
  });
});
