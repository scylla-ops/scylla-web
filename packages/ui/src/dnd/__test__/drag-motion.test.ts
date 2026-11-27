// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { landingIn, MAX_TILT_DEG, springStep, tiltFor } from '../drag-motion.ts';

describe('the motion of a lifted item', () => {
  it('follows a moving pointer at most two frames late, and stops on it with no bounce', () => {
    // The pointer moves at 1000 px/s for one second, then stops.
    let axis = { value: 0, velocity: 0 };
    const frame = 1 / 60;
    for (let time = frame; time <= 1; time += frame) {
      axis = springStep(axis, time * 1000, frame);
    }
    expect(1000 - axis.value).toBeLessThan((2 * 1000) / 60);
    let peak = axis.value;
    for (let index = 0; index < 60; index += 1) {
      axis = springStep(axis, 1000, frame);
      peak = Math.max(peak, axis.value);
    }
    expect(axis.value).toBeCloseTo(1000, 1);
    expect(peak).toBeLessThan(1000.5);
  });

  it('does not jump past the target after a slow frame', () => {
    const axis = springStep({ value: 0, velocity: 0 }, 100, 0.5);
    expect(axis.value).toBeLessThanOrEqual(100);
    expect(axis.value).toBeGreaterThan(99);
  });

  it('tilts the way the pointer goes, at most 2°, and not at rest', () => {
    expect(tiltFor(0)).toBe(0);
    expect(tiltFor(500)).toBeGreaterThan(0);
    expect(tiltFor(-500)).toBeLessThan(0);
    expect(tiltFor(100_000)).toBe(MAX_TILT_DEG);
    expect(tiltFor(-100_000)).toBe(-MAX_TILT_DEG);
  });

  it('lands in a slot of its size as it is, and shrinks into a smaller box, centered and faded', () => {
    const size = { width: 400, height: 300 };
    expect(
      landingIn({ left: 10, top: 20, width: 400, height: 300 }, size, { x: 50, y: 50 }),
    ).toEqual({
      at: { x: 10, y: 20 },
      scale: 1,
      opacity: 1,
    });
    const chip = { left: 100, top: 100, width: 120, height: 30 };
    const { at, scale, opacity } = landingIn(chip, size, { x: 50, y: 50 });
    expect(scale).toBeCloseTo(0.1);
    expect(opacity).toBe(0);
    // The center of the item, scaled around the point where it was taken, is the center of the chip.
    expect(at.x + 50 + (200 - 50) * scale).toBeCloseTo(160);
    expect(at.y + 50 + (150 - 50) * scale).toBeCloseTo(115);
  });
});
