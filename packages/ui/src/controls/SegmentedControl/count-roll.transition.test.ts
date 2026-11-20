import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ENTER,
  LEAVE_MS,
  PULSE_FROM_PX,
  PULSE_MS,
  PULSE_TO_PX,
  ROLL_PX,
  createCountRoll,
} from './count-roll.transition.ts';

const node = document.createElement('span');

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

afterEach(() => vi.restoreAllMocks());

describe('createCountRoll', () => {
  it('rolls up when the count grows: the old number goes up, the new one comes from below', () => {
    let count = 2;
    const { rollIn, rollOut } = createCountRoll(() => count);
    count = 3;

    const leave = rollOut(node);
    const enter = rollIn(node);

    expect(leave.duration).toBe(LEAVE_MS);
    expect(leave.css?.(0, 1)).toContain(`translateY(${-ROLL_PX}px)`);
    expect(leave.css?.(0, 1)).toContain('opacity: 0');
    expect(enter.duration).toBe(ENTER.duration);
    expect(enter.css?.(0, 1)).toContain(`translateY(${ROLL_PX}px)`);
    expect(enter.css?.(1, 0)).toContain('translateY(0px)');
  });

  it('rolls down when the count falls', () => {
    let count = 3;
    const { rollIn, rollOut } = createCountRoll(() => count);
    count = 1;

    expect(rollOut(node).css?.(0, 1)).toContain(`translateY(${ROLL_PX}px)`);
    expect(rollIn(node).css?.(0, 1)).toContain(`translateY(${-ROLL_PX}px)`);
  });

  it('shows the new number before the end of its roll', () => {
    let count = 0;
    const { rollIn } = createCountRoll(() => count);
    count = 1;

    expect(rollIn(node).css?.(0.5, 0.5)).toContain('opacity: 1');
  });

  it('grows a ring from the dot only when the count grows', () => {
    let count = 1;
    const { pulse } = createCountRoll(() => count);

    count = 2;
    const grow = pulse(node);
    count = 1;
    const fall = pulse(node);

    expect(grow.duration).toBe(PULSE_MS);
    expect(grow.css?.(0, 1)).toContain(`width: ${PULSE_FROM_PX}px`);
    expect(grow.css?.(1, 0)).toContain(`width: ${PULSE_TO_PX}px`);
    expect(grow.css?.(1, 0)).toContain('opacity: 0');
    expect(fall.duration).toBe(0);
  });

  it('does not roll or pulse when the user asks for less motion', () => {
    setReducedMotion(true);
    let count = 1;
    const { rollIn, rollOut, pulse } = createCountRoll(() => count);
    count = 2;

    expect(rollOut(node).duration).toBe(0);
    expect(rollIn(node).duration).toBe(0);
    expect(pulse(node).duration).toBe(0);
  });
});
