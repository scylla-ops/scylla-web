/**
 * The motion of a lifted item, in plain TypeScript: the spring that follows the pointer, the tilt
 * that follows the speed, and the flight into a box. `createDragGhost` runs them at each frame.
 */
import { springEasing } from '../motion/spring.ts';
import type { Box, Point } from './geometry.ts';

/**
 * The stiffness of the spring that follows the pointer, in rad/s. Critically damped: no bounce,
 * and at a normal speed the item is never more than a frame or two late.
 */
export const FOLLOW_OMEGA = 90;
/** The lifted item grows this much. */
export const LIFT_SCALE = 1.03;
/** The most that the lifted item tilts, in degrees. */
export const MAX_TILT_DEG = 2;
/** The speed of the pointer (px/s) that gives the most tilt. */
const TILT_SPEED = 1400;
/** The time that a dropped item takes to go into its slot, or back to its place. */
export const SETTLE_MS = 220;
/** Under this scale, an item that flies into a smaller box also fades. */
const FADE_UNDER = 0.5;

/** The flight of a drop: a short spring with a small bounce. */
export const settleEasing = springEasing({ bounce: 0.12, duration: SETTLE_MS });

/** A value and its speed, on one axis. */
export interface Axis {
  value: number;
  velocity: number;
}

/**
 * One step of a critically damped spring toward `target`, `dt` seconds later. Exact for any `dt`:
 * a slow frame does not make it jump past the target.
 */
export const springStep = (
  { value, velocity }: Axis,
  target: number,
  dt: number,
  omega = FOLLOW_OMEGA,
): Axis => {
  const offset = value - target;
  const decay = Math.exp(-omega * dt);
  const drift = velocity + omega * offset;
  return {
    value: target + (offset + drift * dt) * decay,
    velocity: (velocity - omega * dt * drift) * decay,
  };
};

/** A value that goes toward a target with the time constant `tau` (ms), `dt` ms later. */
export const approach = (value: number, target: number, dt: number, tau: number): number =>
  value + (target - value) * (1 - Math.exp(-dt / tau));

/** The tilt of a speed along x, in degrees: the item leans the way it goes, and at most 2°. */
export const tiltFor = (velocityX: number): number =>
  Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, (velocityX / TILT_SPEED) * MAX_TILT_DEG));

/** Where a flight ends: the top left corner of the item, its scale and its opacity. */
export interface Landing {
  at: Point;
  scale: number;
  opacity: number;
}

/**
 * The end of the flight of an item of `size`, scaled around `origin` (from its top left corner),
 * into `box`. A box of its size takes it as it is. A smaller box takes it scaled down, its center
 * on the center of the box, and it fades when it gets much smaller (a folded section).
 */
export const landingIn = (
  box: Box,
  size: Pick<Box, 'width' | 'height'>,
  origin: Point,
): Landing => {
  const scale = Math.min(
    1,
    box.width / Math.max(size.width, 1),
    box.height / Math.max(size.height, 1),
  );
  if (scale > 0.95) return { at: { x: box.left, y: box.top }, scale: 1, opacity: 1 };
  // A point (px, py) of the item shows at `at + origin + (p - origin) * scale`.
  const centerX = box.left + box.width / 2;
  const centerY = box.top + box.height / 2;
  return {
    at: {
      x: centerX - origin.x - (size.width / 2 - origin.x) * scale,
      y: centerY - origin.y - (size.height / 2 - origin.y) * scale,
    },
    scale,
    opacity: scale < FADE_UNDER ? 0 : 1,
  };
};
