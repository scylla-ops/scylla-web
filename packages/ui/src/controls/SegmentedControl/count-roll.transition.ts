import { untrack } from 'svelte';
import { cubicIn, cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { motionDuration } from '../../motion/reduced-motion.ts';
import { springEasing } from '../../motion/spring.ts';

export const ROLL_PX = 14;
export const LEAVE_MS = 220;
export const ENTER = { bounce: 0.25, duration: 370 };
export const ENTER_FADE_MS = 150;
export const PULSE_MS = 600;
export const PULSE_FROM_PX = 6;
export const PULSE_TO_PX = 20;

const enter = springEasing(ENTER);

/**
 * The transitions of a count that changes: the old number leaves and the new one enters, up when
 * the count grows, down when it falls. `pulse` is a ring that grows from a dot when it grows.
 *
 * The leaving number runs first, when the count is already new: each transition compares the
 * count with the last one it saw, so all of them agree on the way.
 */
export const createCountRoll = (count: () => number) => {
  let shown = untrack(count);
  let rising = true;

  const way = () => {
    const next = count();
    if (next !== shown) {
      rising = next > shown;
      shown = next;
    }
    return rising ? 1 : -1;
  };

  const rollIn = (_node: Element): TransitionConfig => {
    const from = way() * ROLL_PX;
    return {
      duration: motionDuration(ENTER.duration),
      css: t =>
        `transform: translateY(${from * (1 - enter(t))}px); ` +
        `opacity: ${Math.min(1, (t * ENTER.duration) / ENTER_FADE_MS)}`,
    };
  };

  const rollOut = (_node: Element): TransitionConfig => {
    const to = -way() * ROLL_PX;
    return {
      duration: motionDuration(LEAVE_MS),
      easing: cubicIn,
      css: (t, u) => `transform: translateY(${to * u}px); opacity: ${t}`,
    };
  };

  const pulse = (_node: Element): TransitionConfig => {
    if (way() < 0) return { duration: 0 };
    return {
      duration: motionDuration(PULSE_MS),
      easing: cubicOut,
      css: t => {
        const size = PULSE_FROM_PX + (PULSE_TO_PX - PULSE_FROM_PX) * t;
        return `width: ${size}px; height: ${size}px; opacity: ${1 - t}`;
      },
    };
  };

  return { rollIn, rollOut, pulse };
};
