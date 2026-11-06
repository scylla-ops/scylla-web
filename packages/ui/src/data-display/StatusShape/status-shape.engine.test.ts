// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createStatusShape, type Rgb, type StatusShape } from './status-shape.engine.ts';
import { C, FORMS, RUN_RADIUS, type ShapeForm } from './status-shape.forms.ts';

const GREEN: Rgb = [93, 153, 114];
const RED: Rgb = [200, 88, 79];
const FRAME = 1 / 240;
const FORM_NAMES = Object.keys(FORMS) as ShapeForm[];

const run = (shape: StatusShape, seconds: number, onStep?: () => void) => {
  for (let t = 0; t < seconds; t += FRAME) {
    shape.step(FRAME);
    onStep?.();
  }
};

/** The farthest a dot moves in one frame, over `seconds`. */
const largestStep = (shape: StatusShape, seconds: number) => {
  let previous = shape.positions(), largest = 0;
  run(shape, seconds, () => {
    const next = shape.positions();
    next.forEach((p, i) => (largest = Math.max(largest, Math.hypot(p.x - previous[i].x, p.y - previous[i].y))));
    previous = next;
  });
  return largest;
};

const distanceToForm = (shape: StatusShape, form: ShapeForm) =>
  Math.max(...shape.positions().map((p, i) => Math.hypot(p.x - FORMS[form].pts[i].x, p.y - FORMS[form].pts[i].y)));

describe('createStatusShape', () => {
  it('starts with its dots on the places of its form', () => {
    for (const form of FORM_NAMES.filter(form => form !== 'running')) {
      expect(distanceToForm(createStatusShape({ form, color: GREEN }), form)).toBeLessThan(0.001);
    }
  });

  it('starts a run with its marbles already on their circle', () => {
    const shape = createStatusShape({ form: 'running', color: GREEN });

    for (const p of shape.positions()) expect(Math.hypot(p.x - C, p.y - C)).toBeCloseTo(RUN_RADIUS, 3);
  });

  it('settles on the places of the new form after a change', () => {
    // Not to running (the marbles run) nor to queued (the grid breathes): those never settle.
    const still = FORM_NAMES.filter(form => form !== 'running' && form !== 'queued');
    for (const from of FORM_NAMES) {
      for (const to of still.filter(form => form !== from)) {
        const shape = createStatusShape({ form: from, color: GREEN });
        run(shape, 1.3);
        shape.setForm(to, RED);
        run(shape, 4);
        expect(shape.form).toBe(to);
        expect(distanceToForm(shape, to)).toBeLessThan(1);
      }
    }
  });

  it('never makes a dot jump, whenever the run is left or joined', () => {
    // In the logical space (400 wide), a dot moves at most 10 units a frame: nothing teleports.
    for (const to of FORM_NAMES.filter(form => form !== 'running')) {
      for (let at = 1.2; at < 4.2; at += 0.25) {
        const leaving = createStatusShape({ form: 'queued', color: GREEN });
        leaving.setForm('running', GREEN);
        run(leaving, at);
        leaving.setForm(to, RED);
        expect(largestStep(leaving, 2.5)).toBeLessThan(10);
      }
      const joining = createStatusShape({ form: to, color: GREEN });
      run(joining, 1.5);
      joining.setForm('running', RED);
      expect(largestStep(joining, 2.5)).toBeLessThan(10);
    }
  });

  it('goes straight to the new form when motion is reduced', () => {
    const shape = createStatusShape({ form: 'running', color: GREEN, reduced: true });
    shape.setForm('failed', RED);
    shape.step(FRAME);

    expect(distanceToForm(shape, 'failed')).toBeLessThan(0.001);
  });

  it('draws an opaque form in the middle of the surface and leaves its corners clear', () => {
    const shape = createStatusShape({ form: 'passed', color: GREEN });
    const surface = { width: 40, height: 40, data: new Uint8ClampedArray(40 * 40 * 4) };
    const box = shape.draw(surface);
    const pixel = (x: number, y: number) => [...surface.data.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)];

    expect(pixel(20, 20)).toEqual([...GREEN, 255]);
    expect(pixel(0, 0)[3]).toBe(0);
    expect(box.x0).toBeGreaterThanOrEqual(0);
    expect(box.x1).toBeLessThanOrEqual(40);
  });
});
