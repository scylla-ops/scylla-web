import type { StatusState } from '../status-state.ts';

/** The five forms the four dots can take. */
export type ShapeForm = 'queued' | 'running' | 'passed' | 'failed' | 'skipped';

export interface Point {
  x: number;
  y: number;
}

export interface FormSpec {
  /** The place of each of the four dots, in the logical space (`SIZE` × `SIZE`). */
  pts: readonly [Point, Point, Point, Point];
  /** The radius of the dots, as a part of `DOT`. */
  scale: number;
  /** The length of a dot, as a part of its width, drawn as a capsule (round ends, one width). */
  stretch: number;
  /** How the form moves once whole. */
  effect: 'breathe' | 'pop' | 'shake' | 'none';
}

/** The logical space of the forms; the drawing scales it to the canvas. */
export const SIZE = 400;
export const C = SIZE / 2;
/** The radius of a dot, in the logical space. */
export const DOT = 22;
/** The forms fill this much more of the canvas than the logical space says: a 40 px icon reads. */
export const ZOOM = 1.8;
/** The radius of the circle the marbles run on. */
export const RUN_RADIUS = 68;

const ring = (r: number): FormSpec['pts'] => {
  const at = (i: number): Point => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
  };
  return [at(0), at(1), at(2), at(3)];
};

const slash = (gap: number): FormSpec['pts'] => {
  const at = (k: number): Point => ({ x: C + k * gap, y: C - k * gap });
  return [at(-1.5), at(-0.5), at(0.5), at(1.5)];
};

/**
 * queued  the 2 × 2 grid of the logo, breathing.
 * running the marbles run round a circle (see `spinAt`).
 * passed  the four merge into one disc, which pops once.
 * failed  four pills of one width joined in the middle: a ×, which shakes once.
 * skipped four small dots merged into a slash.
 */
export const FORMS: Record<ShapeForm, FormSpec> = {
  queued: { pts: ring(58), scale: 1, stretch: 1, effect: 'breathe' },
  running: { pts: ring(RUN_RADIUS), scale: 0.85, stretch: 1, effect: 'none' },
  passed: { pts: ring(3), scale: 1.25, stretch: 1, effect: 'pop' },
  failed: { pts: ring(30), scale: 0.5, stretch: 3.4, effect: 'shake' },
  skipped: { pts: slash(18), scale: 0.62, stretch: 1, effect: 'pop' },
};

/** A `Record`, so that a new state fails to compile here. */
const FORM_OF: Record<StatusState, ShapeForm> = {
  success: 'passed',
  failed: 'failed',
  orphaned: 'failed',
  running: 'running',
  pending: 'queued',
  idle: 'queued',
  skipped: 'skipped',
  cancelled: 'skipped',
};

export const shapeFormOf = (state: StatusState): ShapeForm => FORM_OF[state] ?? 'queued';

/** The theme token of the color of each state (`styles.css`). */
const COLOR_VAR: Record<StatusState, string> = {
  success: '--status-passed',
  failed: '--status-failed',
  running: '--status-running',
  pending: '--status-queued',
  idle: '--status-queued',
  skipped: '--status-skipped',
  cancelled: '--status-canceled',
  orphaned: '--status-canceled',
};

export const shapeColorVarOf = (state: StatusState): string => COLOR_VAR[state] ?? COLOR_VAR.idle;
