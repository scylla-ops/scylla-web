import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from '../../motion/reduced-motion.ts';
import { currentTheme } from '../../stores/theme.store.ts';
import type { StatusState } from '../status-state.ts';
import { createStatusShape, type Rgb } from './status-shape.engine.ts';
import { addTicker } from './status-shape.loop.ts';
import { shapeColorVarOf, shapeFormOf } from './status-shape.forms.ts';

export interface StatusShapeRenderOptions {
  state: StatusState;
  /** The side of the square canvas, in CSS px. */
  size: number;
}

// ---- colors -----------------------------------------------------------------------------------

/** The canvas gives back any CSS color as `#rrggbb`, or as `rgba(…)` when it is not opaque. */
const toRgb = (ctx: CanvasRenderingContext2D, css: string): Rgb => {
  ctx.fillStyle = '#000';
  ctx.fillStyle = css.trim() || '#000';
  const value = ctx.fillStyle;
  if (value.startsWith('#')) {
    const channel = (i: number) => parseInt(value.slice(i, i + 2), 16);
    return [channel(1), channel(3), channel(5)];
  }
  const [r = 0, g = 0, b = 0] = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [r, g, b];
};

let seeds = 0;

/**
 * Draws a `StatusShape` on a canvas and keeps it moving: the four dots of the logo, in the
 * form of the state. The options are a getter: a change of state moves the dots to the new
 * form, a change of theme turns them to the new colors, and a change of size resizes the
 * canvas, all in place.
 *
 * `{@attach renderStatusShape(() => ({ state, size }))}`
 */
export const renderStatusShape =
  (options: () => StatusShapeRenderOptions): Attachment<HTMLCanvasElement> =>
  canvas => {
    const ctx = canvas.getContext('2d');
    // No 2D context (a test, an old browser): the canvas keeps its accessible name only.
    if (!ctx) return;

    const colorOf = (state: StatusState) =>
      toRgb(ctx, getComputedStyle(canvas).getPropertyValue(shapeColorVarOf(state)));

    const initial = untrack(options);
    const shape = createStatusShape({
      form: shapeFormOf(initial.state),
      color: colorOf(initial.state),
      reduced: prefersReducedMotion(),
      seed: 11 + 7 * seeds++,
    });

    let image = ctx.createImageData(1, 1);
    $effect(() => {
      const side = Math.max(1, Math.round(options().size * (window.devicePixelRatio || 1)));
      canvas.width = side;
      canvas.height = side;
      image = ctx.createImageData(side, side);
    });

    $effect(() => {
      const { state } = options();
      untrack(() => shape.setForm(shapeFormOf(state), colorOf(state)));
    });

    // The tokens change with the theme: read them again.
    let theme = untrack(currentTheme);
    $effect(() => {
      const next = currentTheme();
      if (next === theme) return;
      theme = next;
      untrack(() => shape.recolor(colorOf(options().state)));
    });

    // A shape off screen keeps moving, but is not drawn.
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    observer.observe(canvas);

    const removeTicker = addTicker({
      shape,
      paint: () => {
        if (!visible) return;
        const box = shape.draw(image);
        // Only the box around the dots is written: the rest is cleared, not copied.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(image, 0, 0, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      },
    });

    return () => {
      removeTicker();
      observer.disconnect();
    };
  };
