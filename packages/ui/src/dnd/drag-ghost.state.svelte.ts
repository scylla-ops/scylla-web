import { prefersReducedMotion } from '../motion/reduced-motion.ts';
import {
  approach,
  landingIn,
  LIFT_SCALE,
  SETTLE_MS,
  settleEasing,
  springStep,
  tiltFor,
  type Landing,
} from './drag-motion.ts';
import { boxOf, type Box, type Point } from './geometry.ts';

/** The lifted item follows the pointer, or flies into its slot (or back) after the drag. */
export type GhostPhase = 'idle' | 'follow' | 'settle';

type Size = Pick<Box, 'width' | 'height'>;

const NOWHERE: Box = { left: 0, top: 0, width: 0, height: 0 };
/** The time constants of the scale and of the tilt, in ms: they ease, the position springs. */
const SCALE_TAU_MS = 60;
const TILT_TAU_MS = 90;
/** A slow frame counts as this long, so that the motion does not jump. */
const MAX_FRAME_MS = 50;

const mix = (from: number, to: number, k: number) => from + (to - from) * k;
const px = (value: number) => Math.round(value * 10) / 10;

/**
 * The item that a drag lifts. It leaves its place (`position: fixed`), grows a little, follows the
 * pointer on a stiff spring, and tilts with the speed of the pointer; the tilt settles to 0 when the
 * pointer stops. The point where the person took it stays under the pointer. After the drag, it
 * flies into its slot (`settle`) or back to its place (`back`) on a short spring, then the owner
 * puts the item in its new place and calls `end`.
 *
 * Apply `style` to the lifted element, and a large shadow while `lifted`. With a reduced motion
 * there is no tilt, no spring and no flight: the item moves at once.
 */
export const createDragGhost = () => {
  let phase = $state<GhostPhase>('idle');
  let start = $state.raw<Box>(NOWHERE);
  // The size of a slot of another shape (another density): the item takes it.
  let shape = $state.raw<Size | null>(null);
  // From the top left corner, in the size of the lift.
  let grab = $state.raw<Point>({ x: 0, y: 0 });
  let x = $state(0);
  let y = $state(0);
  let scale = $state(1);
  let tilt = $state(0);
  let opacity = $state(1);
  let pointer: Point = { x: 0, y: 0 };
  let velocity: Point = { x: 0, y: 0 };
  let frame = 0;
  let last = 0;
  let flight: { from: Landing; tilt: number; to: Landing; started: number } | null = null;
  let landed: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const size = (): Size => shape ?? start;
  /** The point where the person took the item, in its size of now: the same part of the item. */
  const origin = (): Point =>
    shape
      ? {
          x: (grab.x * shape.width) / Math.max(start.width, 1),
          y: (grab.y * shape.height) / Math.max(start.height, 1),
        }
      : grab;
  const aim = (): Point => {
    const { x: ox, y: oy } = origin();
    return { x: pointer.x - ox, y: pointer.y - oy };
  };
  const snap = () => {
    const to = aim();
    x = to.x;
    y = to.y;
  };

  const step = (now: number) => {
    const dt = Math.min(Math.max(now - last, 0), MAX_FRAME_MS);
    last = now;
    if (phase === 'follow') {
      const to = aim();
      const nextX = springStep({ value: x, velocity: velocity.x }, to.x, dt / 1000);
      const nextY = springStep({ value: y, velocity: velocity.y }, to.y, dt / 1000);
      x = nextX.value;
      y = nextY.value;
      velocity = { x: nextX.velocity, y: nextY.velocity };
      scale = approach(scale, LIFT_SCALE, dt, SCALE_TAU_MS);
      tilt = approach(tilt, tiltFor(velocity.x), dt, TILT_TAU_MS);
    } else if (phase === 'settle' && flight) {
      const t = Math.min((now - flight.started) / SETTLE_MS, 1);
      const k = settleEasing(t);
      x = mix(flight.from.at.x, flight.to.at.x, k);
      y = mix(flight.from.at.y, flight.to.at.y, k);
      scale = mix(flight.from.scale, flight.to.scale, k);
      tilt = mix(flight.tilt, 0, Math.min(k, 1));
      opacity = mix(flight.from.opacity, flight.to.opacity, Math.min(t * 1.5, 1));
      if (t >= 1) return;
    } else return;
    frame = requestAnimationFrame(step);
  };

  const run = () => {
    cancelAnimationFrame(frame);
    last = performance.now();
    frame = requestAnimationFrame(step);
  };

  const land = () => {
    clearTimeout(timer);
    const resolve = landed;
    landed = null;
    resolve?.();
  };

  /**
   * The item flies into `box`, its slot: it lands there at its size, or scaled down into a smaller
   * box (a folded section). The promise resolves when it is there.
   */
  const settle = (box: Box): Promise<void> => {
    if (phase === 'idle') return Promise.resolve();
    land();
    const to = landingIn(box, size(), origin());
    phase = 'settle';
    if (prefersReducedMotion()) {
      x = to.at.x;
      y = to.at.y;
      scale = to.scale;
      tilt = 0;
      opacity = to.opacity;
      return Promise.resolve();
    }
    flight = { from: { at: { x, y }, scale, opacity }, tilt, to, started: performance.now() };
    run();
    return new Promise(resolve => {
      landed = resolve;
      // The last frame may come after the time: the item is at its end at the time.
      timer = setTimeout(() => {
        x = to.at.x;
        y = to.at.y;
        scale = to.scale;
        tilt = 0;
        opacity = to.opacity;
        cancelAnimationFrame(frame);
        land();
      }, SETTLE_MS);
    });
  };

  return {
    get phase(): GhostPhase {
      return phase;
    },
    /** An item is lifted, or flies into its slot. */
    get active() {
      return phase !== 'idle';
    },
    /** The item follows the pointer: give it its large shadow. */
    get lifted() {
      return phase === 'follow';
    },
    /** The box of the item when it left its place, in its size of now. */
    get box(): Box {
      return { ...start, ...size() };
    },
    /** The top left corner of the item now, before its scale and its tilt. */
    get at(): Point {
      return { x, y };
    },
    get tilt() {
      return tilt;
    },
    get scale() {
      return scale;
    },
    /** The style of the lifted element: over the page, at its place of now. Empty when idle. */
    get style(): string {
      if (phase === 'idle') return '';
      const { width, height } = size();
      const { x: ox, y: oy } = origin();
      return [
        'position: fixed',
        'left: 0',
        'top: 0',
        'margin: 0',
        'z-index: 50',
        `width: ${px(width)}px`,
        `height: ${px(height)}px`,
        `transform: translate3d(${px(x)}px, ${px(y)}px, 0) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
        `transform-origin: ${px(ox)}px ${px(oy)}px`,
        opacity < 1 ? `opacity: ${opacity.toFixed(3)}` : '',
        'will-change: transform',
        'transition: box-shadow 200ms ease-out',
      ]
        .filter(Boolean)
        .join('; ');
    },
    /** The drag starts: the item leaves `box`, taken at `taken` (from its top left corner). */
    lift(box: Box, taken: Point, at: Point) {
      cancelAnimationFrame(frame);
      land();
      start = boxOf(box);
      grab = taken;
      shape = null;
      pointer = at;
      x = box.left;
      y = box.top;
      velocity = { x: 0, y: 0 };
      scale = 1;
      tilt = 0;
      opacity = 1;
      flight = null;
      phase = 'follow';
      if (prefersReducedMotion()) snap();
      else run();
    },
    follow(at: Point) {
      if (phase !== 'follow') return;
      pointer = at;
      if (prefersReducedMotion()) snap();
    },
    /** The item takes the size of a slot of another shape; `null` gives it its own size again. */
    reshape(next: Size | null) {
      if (phase !== 'follow') return;
      if (next?.width === shape?.width && next?.height === shape?.height) return;
      shape = next;
      if (prefersReducedMotion()) snap();
    },
    settle,
    /** The item flies back to the place where it was taken, at its own size. */
    back(): Promise<void> {
      shape = null;
      return settle(start);
    },
    /** The item is in its place: the ghost is idle. */
    end() {
      cancelAnimationFrame(frame);
      land();
      flight = null;
      shape = null;
      phase = 'idle';
    },
  };
};

export type DragGhost = ReturnType<typeof createDragGhost>;
