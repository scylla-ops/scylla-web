// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  LEADING_REACH,
  REDUCED_MS,
  SETTLE,
  STRETCH_MS,
  TRAILING_REACH,
  thumbKeyframes,
  type Box,
} from './thumb-motion.ts';

const LEFT: Box = { x: 3, y: 3, width: 40, height: 28 };
const RIGHT: Box = { x: 103, y: 3, width: 60, height: 28 };
const LANDED_MS = 250;

const px = (value: unknown) => parseFloat(String(value));
const edges = (frame: Keyframe) => ({
  left: px(frame.left),
  right: px(frame.left) + px(frame.width),
});
const at = (keyframes: Keyframe[], ms: number, duration: number) =>
  keyframes.find(frame => Math.abs((frame.offset ?? 0) * duration - ms) < 1e-6)!;

describe('thumbKeyframes', () => {
  it('starts on the old segment and ends on the new one', () => {
    const { keyframes } = thumbKeyframes(LEFT, RIGHT, { move: 'stretch', reduced: false });

    expect(keyframes[0]).toMatchObject({ offset: 0, left: '3px', width: '40px' });
    expect(keyframes.at(-1)).toMatchObject({ offset: 1, left: '103px', width: '60px' });
  });

  it('moves the right edge first when it goes right', () => {
    const { keyframes, duration } = thumbKeyframes(LEFT, RIGHT, { move: 'stretch', reduced: false });

    const stretched = edges(at(keyframes, STRETCH_MS, duration));

    expect(duration).toBe(STRETCH_MS + SETTLE.duration);
    expect(stretched.left).toBeCloseTo(3 + TRAILING_REACH * 100);
    expect(stretched.right).toBeCloseTo(43 + LEADING_REACH * 120);
  });

  it('moves the left edge first when it goes left', () => {
    const { keyframes, duration } = thumbKeyframes(RIGHT, LEFT, { move: 'stretch', reduced: false });

    const stretched = edges(at(keyframes, STRETCH_MS, duration));

    expect(stretched.left).toBeCloseTo(103 - LEADING_REACH * 100);
    expect(stretched.right).toBeCloseTo(163 - TRAILING_REACH * 120);
  });

  it('goes a little past the new segment before it settles', () => {
    const { keyframes } = thumbKeyframes(LEFT, RIGHT, { move: 'stretch', reduced: false });

    const furthest = Math.max(...keyframes.map(frame => edges(frame).right));

    expect(furthest).toBeGreaterThan(163);
    expect(furthest).toBeLessThan(165);
  });

  it('is on the new segment after a quarter of a second: only the bounce moves it after that', () => {
    const { keyframes, duration } = thumbKeyframes(LEFT, RIGHT, { move: 'stretch', reduced: false });

    const late = keyframes.filter(frame => (frame.offset ?? 0) * duration >= LANDED_MS);

    expect(late.length).toBeGreaterThan(1);
    for (const frame of late) {
      const { left, right } = edges(frame);
      expect(Math.abs(left - 103)).toBeLessThan(2);
      expect(Math.abs(right - 163)).toBeLessThan(2);
    }
  });

  it('only settles when it follows a change of size', () => {
    const { keyframes, duration } = thumbKeyframes(LEFT, RIGHT, { move: 'settle', reduced: false });

    expect(duration).toBe(SETTLE.duration);
    expect(keyframes.at(-1)).toMatchObject({ offset: 1, left: '103px', width: '60px' });
  });

  it('slides with no stretch and no bounce when the user asks for less motion', () => {
    const { keyframes, duration } = thumbKeyframes(LEFT, RIGHT, { move: 'stretch', reduced: true });

    expect(duration).toBe(REDUCED_MS);
    for (const frame of keyframes) {
      const { left, right } = edges(frame);
      expect((left - 3) / 100).toBeCloseTo((right - 43) / 120);
      expect(right).toBeLessThanOrEqual(163);
    }
    expect(keyframes.at(-1)).toMatchObject({ offset: 1, left: '103px', width: '60px' });
  });
});
