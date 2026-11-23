import { describe, it, expect, vi } from 'vitest';
import { flushSync, untrack } from 'svelte';
import { SETTLE_MS, SPIN_MS, angleOf, spin } from './logo-mark.attachments.svelte.ts';

const spinning = (element: Element, initial: boolean) => {
  let on = $state(initial);
  const stop = $effect.root(() => {
    $effect(() => untrack(() => spin(() => on)(element)));
  });
  flushSync();
  return {
    set: (next: boolean) => {
      on = next;
      flushSync();
    },
    stop,
  };
};

const reduceMotion = () =>
  vi.mocked(window.matchMedia).mockImplementation(
    query => ({ matches: query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
  );

describe('angleOf', () => {
  it.each([
    ['none', 0],
    ['matrix(1, 0, 0, 1, 0, 0)', 0],
    ['matrix(0, 1, -1, 0, 0, 0)', 90],
    ['matrix(-1, 0, 0, -1, 0, 0)', 180],
    ['matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)', 315],
  ])('reads %s as %i°', (transform, degrees) => {
    expect(angleOf(transform)).toBeCloseTo(degrees, 3);
  });
});

describe('spin', () => {
  it('turns the mark with scylla-spin while it waits', () => {
    const element = document.createElement('div');

    const mark = spinning(element, true);

    expect(element.animate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ transform: 'rotate(270deg)', offset: 0.4 })]),
      { duration: SPIN_MS, iterations: Infinity },
    );
    mark.stop();
  });

  it('stops on the next quarter turn, not back at 0', () => {
    const element = document.createElement('div');
    const mark = spinning(element, true);
    const turn = vi.mocked(element.animate).mock.results[0]?.value as Animation;
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      transform: 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)',
    } as CSSStyleDeclaration);

    mark.set(false);

    expect(turn.playState).toBe('idle');
    expect(element.animate).toHaveBeenLastCalledWith(
      [{ transform: 'rotate(45deg)' }, { transform: 'rotate(90deg)' }],
      expect.objectContaining({ duration: SETTLE_MS / 2, easing: 'ease-out' }),
    );
    vi.mocked(window.getComputedStyle).mockRestore();
    mark.stop();
  });

  it('does not turn with reduced motion', () => {
    reduceMotion();
    const element = document.createElement('div');

    const mark = spinning(element, true);
    mark.set(false);

    expect(element.animate).not.toHaveBeenCalled();
    mark.stop();
  });
});
