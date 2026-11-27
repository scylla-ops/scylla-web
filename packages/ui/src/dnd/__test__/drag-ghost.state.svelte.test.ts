import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDragGhost } from '../drag-ghost.state.svelte.ts';
import { LIFT_SCALE, SETTLE_MS } from '../drag-motion.ts';

const BOX = { left: 100, top: 200, width: 400, height: 300 };
const GRAB = { x: 40, y: 30 };
const FRAME = 16;

const reduceMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'setTimeout',
      'clearTimeout',
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
  reduceMotion(false);
});

describe('createDragGhost', () => {
  it('lifts the item over the page at its place, then follows the pointer and lands on it', () => {
    const ghost = createDragGhost();
    ghost.lift(BOX, GRAB, { x: 140, y: 230 });

    expect(ghost.phase).toBe('follow');
    expect(ghost.lifted).toBe(true);
    expect(ghost.style).toContain('position: fixed');
    expect(ghost.style).toContain('translate3d(100px, 200px, 0)');
    expect(ghost.style).toContain('transform-origin: 40px 30px');

    ghost.follow({ x: 340, y: 230 });
    vi.advanceTimersByTime(FRAME);
    // A light spring: on its way after one frame, there after a few.
    expect(ghost.at.x).toBeGreaterThan(100);
    expect(ghost.at.x).toBeLessThan(300);
    vi.advanceTimersByTime(FRAME * 30);
    expect(ghost.at.x).toBeCloseTo(300, 0);
    expect(ghost.scale).toBeCloseTo(LIFT_SCALE, 3);
  });

  it('tilts while the pointer moves to the right, and stands straight again when it stops', () => {
    const ghost = createDragGhost();
    ghost.lift(BOX, GRAB, { x: 140, y: 230 });
    for (let step = 1; step <= 10; step += 1) {
      ghost.follow({ x: 140 + step * 20, y: 230 });
      vi.advanceTimersByTime(FRAME);
    }
    expect(ghost.tilt).toBeGreaterThan(0.5);
    expect(ghost.tilt).toBeLessThanOrEqual(2);

    vi.advanceTimersByTime(FRAME * 60);
    expect(Math.abs(ghost.tilt)).toBeLessThan(0.05);
  });

  it('flies into its slot after the drop, straight and at its size, then waits for the end', async () => {
    const ghost = createDragGhost();
    ghost.lift(BOX, GRAB, { x: 140, y: 230 });
    ghost.follow({ x: 600, y: 230 });
    vi.advanceTimersByTime(FRAME * 5);

    let landed = false;
    void ghost.settle({ left: 520, top: 200, width: 400, height: 300 }).then(() => (landed = true));
    expect(ghost.phase).toBe('settle');
    expect(ghost.lifted).toBe(false);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);

    expect(landed).toBe(true);
    expect(ghost.at).toEqual({ x: 520, y: 200 });
    expect(ghost.tilt).toBe(0);
    expect(ghost.scale).toBe(1);
    expect(ghost.active).toBe(true);
    ghost.end();
    expect(ghost.style).toBe('');
  });

  it('flies back to the place where it was taken', async () => {
    const ghost = createDragGhost();
    ghost.lift(BOX, GRAB, { x: 140, y: 230 });
    ghost.follow({ x: 700, y: 600 });
    vi.advanceTimersByTime(FRAME * 10);

    const back = ghost.back();
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    await back;

    expect(ghost.at).toEqual({ x: 100, y: 200 });
  });

  it('takes the size of a slot of another shape, and keeps the same part of it under the pointer', () => {
    reduceMotion(true);
    const ghost = createDragGhost();
    ghost.lift(BOX, GRAB, { x: 140, y: 230 });
    ghost.reshape({ width: 200, height: 150 });

    expect(ghost.box).toMatchObject({ width: 200, height: 150 });
    expect(ghost.at).toEqual({ x: 120, y: 215 });
  });

  it('moves at once with a reduced motion: no spring, no tilt, no growth and no flight', async () => {
    reduceMotion(true);
    const ghost = createDragGhost();
    ghost.lift(BOX, GRAB, { x: 140, y: 230 });
    ghost.follow({ x: 640, y: 230 });

    expect(ghost.at).toEqual({ x: 600, y: 200 });
    expect(ghost.tilt).toBe(0);
    expect(ghost.scale).toBe(1);
    await ghost.settle({ left: 0, top: 0, width: 400, height: 300 });
    expect(ghost.at).toEqual({ x: 0, y: 0 });
  });
});
