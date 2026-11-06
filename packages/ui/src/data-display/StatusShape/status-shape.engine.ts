import { C, DOT, FORMS, RUN_RADIUS, SIZE, ZOOM, type ShapeForm, type Point } from './status-shape.forms.ts';
import { BALL_STRIDE, rasterize, writeBall, type Box } from './status-shape.raster.ts';

/**
 * The four dots of the logo, as a little simulation: each dot follows a damped spring to its
 * place in the current form, and a change of form is a move, never a jump. Plain TypeScript:
 * the attachment (`status-shape.attachments.svelte.ts`) gives it time, colors and a canvas.
 *
 * Three moves are drawn by hand instead of by the springs, because a spring would smooth
 * them away: the run of the marbles (`spinAt`), the way out of running (`exitAt`) and the way
 * into it (`enterAt`). Each starts from where the dots are drawn and at their speed.
 */

export type Rgb = readonly [number, number, number];

export interface ShapeSurface {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface StatusShape {
  readonly form: ShapeForm;
  /** Moves the dots to the form, and turns them to the color. */
  setForm(next: ShapeForm, color: Rgb): void;
  /** The same form in another color (a change of theme). */
  recolor(color: Rgb): void;
  /** Advances the simulation by `dt` seconds. Keep `dt` small: the springs are stiff. */
  step(dt: number): void;
  /** Draws into the surface; gives the box it wrote: the rest of the surface is to clear. */
  draw(surface: ShapeSurface): Box;
  /** Where each dot is drawn, in the logical space. */
  positions(): Point[];
}

export interface StatusShapeOptions {
  form: ShapeForm;
  color: Rgb;
  /** No moves: every change is instant (`prefers-reduced-motion`). */
  reduced?: boolean;
  /** Varies the springs, so that two shapes side by side do not move as one. */
  seed?: number;
}

interface Dot {
  i: number;
  /** Spring stiffness and damping: a little under critical, one soft settle. */
  k: number;
  c: number;
  /** Phases and frequencies of the drift of the grid. */
  ph: [number, number, number, number];
  fr: [number, number];
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The target before and after `switchAt`: the dots start one after the other. */
  from: Point;
  to: Point;
  switchAt: number;
  scale: number;
  stretch: number;
  dir: number;
  dirTo: number;
  col: [number, number, number];
  colFrom: Rgb;
  colTo: Rgb;
  colAt: number;
}

interface Exit {
  next: ShapeForm;
  start: number;
  /** The second move starts here, and the new form there. */
  gesture: number;
  end: number;
  /** When the dots take the size and the length of the new form. */
  size: number;
  /** The running clock when the exit started. */
  clock: number;
  dots: {
    th: number;
    R: number;
    w: number;
    vR: number;
    fx: number;
    fy: number;
    s0: number;
    /** Its place in the running form. */
    at: number;
  }[];
  /** The even square the marbles land on, on the way to the disc. Computed once. */
  square?: { a0: number; D: number; slope: number }[];
}

interface Enter {
  from: ShapeForm;
  start: number;
  end: number;
  dots: { x: number; y: number; vx: number; vy: number; sx: number; sy: number }[];
}

const PI = Math.PI;
/** The form is whole about here, after a change: its pop or shake comes then. */
const MERGED_AT = 0.7;
/** The time of a lap of the marbles. */
const LAP = 1.8;
/** How long the dots take to change color. */
const COLOR_TIME = 0.35;
/** Seconds: run, gesture, size, of the way out of running to each form. */
const EXIT_TIMES: Record<Exclude<ShapeForm, 'running'>, readonly [number, number, number]> = {
  passed: [1.3, 0, 0.85],
  failed: [0.55, 0.42, 0.55],
  skipped: [0.6, 0.35, 0.6],
  queued: [0.6, 0, 0.3],
};
const ENTER_TIMES: Record<Exclude<ShapeForm, 'running'>, number> = {
  queued: 0.6,
  passed: 0.85,
  failed: 0.6,
  skipped: 0.8,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (u: number) => {
  const v = clamp(u, 0, 1);
  return v * v * (3 - 2 * v);
};
/** Cubic from p0 (speed m0 per unit of u) to p1 at rest. */
const hermite = (p0: number, p1: number, m0: number, u: number) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1;
};
/** Quintic from p0 (speed m0 per unit of u) to p1 at rest: no jolt at either end. */
const quintic = (p0: number, p1: number, m0: number, u: number) => {
  const u3 = u * u * u, u4 = u3 * u, u5 = u4 * u;
  return (1 - 10 * u3 + 15 * u4 - 6 * u5) * p0 + (u - 6 * u3 + 8 * u4 - 3 * u5) * m0 + (10 * u3 - 15 * u4 + 6 * u5) * p1;
};
const rotate = (x: number, y: number, a: number): [number, number] => {
  const dx = x - C, dy = y - C, c = Math.cos(a), s = Math.sin(a);
  return [C + dx * c - dy * s, C + dx * s + dy * c];
};
const random = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};

/**
 * The turn of marble i, t seconds into running, from its place at angle `at`. As the old
 * Windows spinner: every marble runs the same lap, a little later than the one before it; the
 * lap is slow at the top and fast below (θ = 2πu − A·sin 2πu). Slow, the late marbles catch
 * up and merge; fast, they part again.
 */
const spinAt = (i: number, t: number, at: number): number => {
  const lag = [0, 0.27, 0.56, 0.84][i], A = 0.52 + 0.03 * i;
  const u = (t - lag) / LAP;
  const theta = 2 * PI * u - A * Math.sin(2 * PI * u);
  // The angle of its place from the top, in (−π, π]: the slide in stays short.
  let base = at + PI / 2;
  if (base > PI) base -= 2 * PI;
  return smooth(t / 0.8) * (theta - base);
};

export const createStatusShape = ({ form: initial, color, reduced = false, seed = 7 }: StatusShapeOptions): StatusShape => {
  const rnd = random(seed);
  let form: ShapeForm = initial;
  let now = 0;
  let stateAt = -10;
  let exit: Exit | null = null;
  let enter: Enter | null = null;

  const dots: Dot[] = FORMS[initial].pts.map((p, i) => {
    const k = 85 + 30 * rnd();
    return {
      i,
      k,
      c: 2 * Math.sqrt(k) * (0.78 + 0.1 * rnd()),
      ph: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28],
      fr: [0.25 + 0.5 * rnd(), 0.4 + 0.6 * rnd()],
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      from: p,
      to: p,
      switchAt: 0,
      scale: FORMS[initial].scale,
      stretch: FORMS[initial].stretch,
      dir: Math.atan2(p.y - C, p.x - C),
      dirTo: Math.atan2(p.y - C, p.x - C),
      col: [color[0], color[1], color[2]],
      colFrom: color,
      colTo: color,
      colAt: 0,
    };
  });

  // The running clock: it starts at rest and reaches full pace in 0.6 s (no jolt).
  const runClock = () => {
    const t = now - stateAt, W = 0.6;
    return t < W ? (t * t) / (2 * W) : t - W / 2;
  };
  const placeAngle = (d: Dot) => Math.atan2(d.to.y - C, d.to.x - C);
  const spin = (d: Dot) => (reduced || form !== 'running' ? 0 : spinAt(d.i, runClock(), placeAngle(d)));
  const drawn = (d: Dot): [number, number] => rotate(d.x, d.y, spin(d));

  // The motion of the whole form: the grid breathes, the others pop or shake once.
  const target = (d: Dot): [number, number] => {
    const spec = FORMS[form], p = now >= d.switchAt ? d.to : d.from, u = now - stateAt - MERGED_AT;
    const s = spec.effect === 'pop' ? 1 + 0.12 * Math.exp(-(u * u) / 0.02) : spec.effect === 'breathe' ? 1 + 0.04 * Math.sin(now * 1.3) : 1;
    let x = C + (p.x - C) * s, y = C + (p.y - C) * s;
    if (spec.effect === 'shake' && u > 0) x += 8 * Math.sin(u * 42) * Math.exp(-u * 7);
    if (spec.effect === 'breathe' && !reduced) {
      x += 1.6 * (0.6 * Math.sin(now * d.fr[0] * 2.1 + d.ph[0]) + 0.4 * Math.sin(now * d.fr[1] * 3.3 + d.ph[1]));
      y += 1.6 * (0.6 * Math.sin(now * d.fr[1] * 1.9 + d.ph[2]) + 0.4 * Math.sin(now * d.fr[0] * 2.9 + d.ph[3]));
    }
    return [x, y];
  };

  // ---- the way out of running ----------------------------------------------------------------
  // passed  rev up, then each marble lands on its corner of an even square while the circle
  //         closes into the disc.
  // failed  roll on to the diagonals, wind up out a little, then shoot in into the arms.
  // skipped drift out onto one long line, which shrinks into the slash.
  // queued  slow down and roll to the grid.
  const REV_UP = 0.5, PLACE = 0.8;
  const exitRunAngle = (ex: Exit, j: number, s: number) => {
    // The pace grows to twice its speed over the rev-up, then stays.
    const v = Math.min(1, s / REV_UP);
    const clock = ex.clock + s + REV_UP * (v ** 3 - v ** 4 / 2) + Math.max(0, s - REV_UP);
    return ex.dots[j].at + spinAt(j, clock, ex.dots[j].at);
  };
  /**
   * The even square: each marble goes on from its angle and speed to its corner, θ0 + D·g(u),
   * g a cubic that starts at its speed and ends at rest. g never goes back while the slope it
   * starts with is at most 3, so each marble needs D ≥ ω0·PLACE/3: it slows down or speeds up,
   * but never stalls. The square is turned so that the marbles land closest to where their own
   * speed brings them (ω0·PLACE/2), within that rule.
   */
  const fitSquare = (ex: Exit) => {
    const h = 1 / 240;
    const start = ex.dots.map((_, j) => {
      const a0 = exitRunAngle(ex, j, REV_UP);
      return { a0, w0: Math.max(0.3, (a0 - exitRunAngle(ex, j, REV_UP - h)) / h) };
    });
    let best: { cost: number; D: number[] } | null = null;
    for (let P = 0; P < 2 * PI; P += 0.01) {
      const D = start.map((q, j) => {
        const min = (q.w0 * PLACE) / 3 + 0.05, base = P - j * (PI / 2) - q.a0;
        return base + 2 * PI * Math.ceil((min - base) / (2 * PI));
      });
      const cost = D.reduce((sum, d, j) => sum + (d - (start[j].w0 * PLACE) / 2) ** 2, 0);
      if (!best || cost < best.cost) best = { cost, D };
    }
    const D = best?.D ?? start.map(() => 0);
    return start.map((q, j) => ({ a0: q.a0, D: D[j], slope: D[j] ? (q.w0 * PLACE) / D[j] : 0 }));
  };
  const exitAt = (ex: Exit, i: number, t: number): [number, number] => {
    const o = ex.dots[i], run = ex.gesture - ex.start, u = clamp((t - ex.start) / run, 0, 1);
    const fR = Math.hypot(o.fx, o.fy), fth = Math.atan2(o.fy, o.fx);
    const polar = (R: number, th: number): [number, number] => [R * Math.cos(th), R * Math.sin(th)];
    // Rolls on, at its speed, to (thTo, RTo): to the turn of thTo that is ahead.
    const rollTo = (thTo: number, RTo: number) => {
      const to = thTo + 2 * PI * Math.ceil((o.th + 0.2 * Math.sign(o.w || 1) - thTo) / (2 * PI));
      return polar(hermite(o.R, RTo, o.vR * run, u), hermite(o.th, to, o.w * run, u));
    };
    if (ex.next === 'passed') {
      const s = Math.max(0, t - ex.start), Ropen = RUN_RADIUS * 1.08;
      if (s < REV_UP) return polar(o.R + (Ropen - o.R) * smooth(s / REV_UP), exitRunAngle(ex, i, s));
      ex.square ??= fitSquare(ex);
      const q = ex.square[i], v = clamp((s - REV_UP) / PLACE, 0, 1), sl = q.slope;
      const g = sl * v + (3 - 2 * sl) * v * v + (sl - 2) * v * v * v;
      return polar(quintic(Ropen, fR, 0, clamp((v * PLACE - 0.1) / (PLACE - 0.1), 0, 1)), q.a0 + q.D * g);
    }
    if (ex.next === 'failed') {
      if (t < ex.gesture) return rollTo(fth, RUN_RADIUS);
      const v = clamp((t - ex.gesture) / (ex.end - ex.gesture), 0, 1), e = smooth(v);
      return polar(RUN_RADIUS + (fR - RUN_RADIUS) * e + RUN_RADIUS * 0.15 * Math.sin(PI * Math.min(1, v * 1.6)) * (1 - e), fth);
    }
    if (ex.next === 'skipped') {
      if (t < ex.gesture) return rollTo(fth, fR * 2.4);
      const k = 2.4 - 1.4 * smooth((t - ex.gesture) / (ex.end - ex.gesture));
      return [o.fx * k, o.fy * k];
    }
    return rollTo(fth, fR);
  };

  // ---- the way into running ----------------------------------------------------------------
  // queued  the grid opens out to the circle.
  // passed  the disc opens out; the turn of running carries the dots round.
  // failed  the arms pull back out along the diagonals, a little past the circle, and settle.
  // skipped the slash stretches out along its line, then the dots peel off to the circle.
  const enterAt = (en: Enter, i: number, t: number): [number, number] => {
    const o = en.dots[i], D = en.end - en.start, u = clamp((t - en.start) / D, 0, 1);
    const sR = Math.hypot(o.sx, o.sy), sa = Math.atan2(o.sy, o.sx);
    if (en.from === 'passed') {
      const th0 = Math.atan2(o.y, o.x), e = u * u * u * (10 - 15 * u + 6 * u * u);
      const R = quintic(Math.hypot(o.x, o.y), sR, 0, u), th = th0 + Math.atan2(Math.sin(sa - th0), Math.cos(sa - th0)) * e;
      return [R * Math.cos(th), R * Math.sin(th)];
    }
    if (en.from === 'failed') {
      const R0 = Math.hypot(o.x, o.y), w = u - 1, back = 1 + 2.7 * w * w * w + 1.7 * w * w;
      const R = R0 + (sR - R0) * back;
      return [R * Math.cos(sa), R * Math.sin(sa)];
    }
    if (en.from === 'skipped') {
      const SPLIT = 0.35;
      if (u < SPLIT) {
        const k = 1 + 1.3 * smooth(u / SPLIT);
        return [o.x * k, o.y * k];
      }
      const v = (u - SPLIT) / (1 - SPLIT);
      return [quintic(o.x * 2.3, o.sx, 0, v), quintic(o.y * 2.3, o.sy, 0, v)];
    }
    return [quintic(o.x, o.sx, o.vx * D, u), quintic(o.y, o.sy, o.vy * D, u)];
  };

  // A hand-drawn move drives the dots: their place, and their speed for what comes after.
  const drive = (path: (i: number, t: number) => [number, number]) => {
    const h = 1 / 240;
    dots.forEach((d, i) => {
      const [x1, y1] = path(i, now), [x0, y0] = path(i, now - h);
      d.x = C + x1;
      d.y = C + y1;
      d.vx = (x1 - x0) / h;
      d.vy = (y1 - y0) / h;
    });
  };

  const setForm = (next: ShapeForm, color: Rgb) => {
    if (next === form) return recolor(color);
    // Keep each dot where it is drawn, moving the way it moves: the run goes on into the new
    // form instead of stopping dead. The speed of the turn is measured over a short step.
    const h = 1 / 120;
    for (const d of dots) {
      const [x1, y1] = drawn(d);
      now -= h;
      const [x0, y0] = drawn(d);
      now += h;
      const [svx, svy] = rotate(C + d.vx, C + d.vy, spin(d)).map(v => v - C);
      d.vx = svx + (x1 - x0) / h;
      d.vy = svy + (y1 - y0) / h;
      d.x = x1;
      d.y = y1;
    }

    const spec = FORMS[next], previous = form;
    exit = null;
    enter = null;
    if (previous === 'running' && next !== 'running' && !reduced) {
      const [run, gesture, size] = EXIT_TIMES[next];
      exit = {
        next,
        start: now,
        gesture: now + run,
        end: now + run + gesture,
        size: now + size,
        clock: runClock(),
        dots: dots.map((d, i) => {
          const x = d.x - C, y = d.y - C, R = Math.hypot(x, y) || 1;
          return {
            th: Math.atan2(y, x),
            R,
            w: (x * d.vy - y * d.vx) / (R * R),
            vR: (x * d.vx + y * d.vy) / R,
            fx: spec.pts[i].x - C,
            fy: spec.pts[i].y - C,
            s0: d.scale,
            at: placeAngle(d),
          };
        }),
      };
    }
    form = next;
    // With an exit, the new form starts once the marbles are done.
    stateAt = exit ? exit.end : now;
    if (next === 'running' && !reduced) {
      enter = {
        from: previous,
        start: now,
        end: now + ENTER_TIMES[previous as Exclude<ShapeForm, 'running'>],
        dots: dots.map((d, i) => ({ x: d.x - C, y: d.y - C, vx: d.vx, vy: d.vy, sx: spec.pts[i].x - C, sy: spec.pts[i].y - C })),
      };
    }
    dots.forEach((d, i) => {
      const p = spec.pts[i];
      // Until its start, a dot coasts from where it is; after an exit it is already in place.
      d.from = exit ? p : { x: d.x, y: d.y };
      d.to = p;
      d.dirTo = Math.atan2(p.y - C, p.x - C);
      d.switchAt = stateAt + (reduced ? 0 : i * 0.045 + rnd() * 0.04);
      d.colFrom = [d.col[0], d.col[1], d.col[2]];
      d.colTo = color;
      // With an exit, the color turns as the gesture starts (to the disc: as the square forms).
      d.colAt = !exit ? d.switchAt : next === 'passed' ? exit.start + REV_UP : exit.size;
      if (reduced) {
        d.x = p.x;
        d.y = p.y;
        d.vx = 0;
        d.vy = 0;
        d.col = [color[0], color[1], color[2]];
        d.scale = spec.scale;
        d.stretch = spec.stretch;
        d.dir = d.dirTo;
      }
    });
  };

  const recolor = (color: Rgb) => {
    for (const d of dots) {
      d.colFrom = [d.col[0], d.col[1], d.col[2]];
      d.colTo = color;
      d.colAt = now;
    }
  };

  const step = (dt: number) => {
    now += dt;
    const spec = FORMS[form];
    if (exit && now < exit.end) {
      const ex = exit;
      drive((i, t) => exitAt(ex, i, t));
      // To the disc, the marbles grow while the square closes (its last 0.6 s).
      if (ex.next === 'passed') {
        const u = smooth((now - (ex.end - 0.6)) / 0.6);
        dots.forEach((d, i) => (d.scale = ex.dots[i].s0 + (spec.scale - ex.dots[i].s0) * u));
      }
    } else exit = null;
    if (enter && now < enter.end) {
      const en = enter;
      drive((i, t) => enterAt(en, i, t));
    } else enter = null;

    for (const d of dots) {
      if (!exit && !enter) {
        const [tx, ty] = target(d);
        if (reduced) {
          d.x = tx;
          d.y = ty;
        } else {
          d.vx += (d.k * (tx - d.x) - d.c * d.vx) * dt;
          d.vy += (d.k * (ty - d.y) - d.c * d.vy) * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
        }
      }
      // During an exit, the dots take the size and the length of the form from `exit.size` on.
      if (now >= d.switchAt || (exit && now >= exit.size)) {
        if (!(exit?.next === 'passed')) d.scale += (spec.scale - d.scale) * Math.min(1, dt * 7);
        d.stretch += (spec.stretch - d.stretch) * Math.min(1, dt * 6);
        // A capsule is the same turned by π: turn by the shortest way.
        const turn = (((d.dirTo - d.dir) % PI) + 1.5 * PI) % PI - PI / 2;
        d.dir += turn * Math.min(1, dt * 6);
      }
      const e = smooth((now - d.colAt) / COLOR_TIME);
      for (let c = 0; c < 3; c++) d.col[c] = d.colFrom[c] + (d.colTo[c] - d.colFrom[c]) * e;
    }
  };

  // Reused between frames: one buffer of balls and colors per shape.
  const balls = new Float64Array(dots.length * BALL_STRIDE);
  const colors = new Float64Array(dots.length * 3);
  const draw = (surface: ShapeSurface): Box => {
    const px = (surface.width / SIZE) * ZOOM, off = surface.width / 2 - C * px;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    dots.forEach((d, j) => {
      const [x, y] = drawn(d);
      const r = DOT * px * d.scale, half = r * (d.stretch - 1);
      const bx = x * px + off, by = y * px + off;
      writeBall(balls, j, { x: bx, y: by, r2: r * r, ux: Math.cos(d.dir), uy: Math.sin(d.dir), half });
      colors.set(d.col, j * 3);
      // Beyond 2.2 r of every dot the field stays under 1: only this box is drawn.
      const reach = 2.2 * (r + half);
      x0 = Math.min(x0, bx - reach);
      x1 = Math.max(x1, bx + reach);
      y0 = Math.min(y0, by - reach);
      y1 = Math.max(y1, by + reach);
    });
    const box = {
      x0: clamp(Math.floor(x0), 0, surface.width),
      x1: clamp(Math.ceil(x1), 0, surface.width),
      y0: clamp(Math.floor(y0), 0, surface.height),
      y1: clamp(Math.ceil(y1), 0, surface.height),
    };
    rasterize(surface.data, surface.width, box, balls, dots.length, colors);
    return box;
  };

  return {
    get form() {
      return form;
    },
    setForm,
    recolor,
    step,
    draw,
    positions: () => dots.map(d => {
      const [x, y] = drawn(d);
      return { x, y };
    }),
  };
};
