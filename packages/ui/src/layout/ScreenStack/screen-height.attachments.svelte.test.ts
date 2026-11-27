import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { SCREEN_MS } from '../../motion/screen-slide.ts';
import { followScreenHeight } from './screen-height.attachments.svelte.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

/** A box whose height the test sets: jsdom has no layout. */
const boxOf = () => {
  const box = document.createElement('div');
  let height = 100;
  box.getBoundingClientRect = () => ({ height }) as DOMRect;
  const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
  box.animate = animate;
  return { box, animate, setHeight: (next: number) => (height = next) };
};

afterEach(() => vi.restoreAllMocks());

describe('followScreenHeight', () => {
  it('moves the box from its height before the change to its height after it', () => {
    setReducedMotion(false);
    const { box, animate, setHeight } = boxOf();
    let screen = $state<string | null>(null);

    const cleanup = $effect.root(() => {
      $effect(() => followScreenHeight(() => screen)(box));
    });
    flushSync();
    expect(animate).not.toHaveBeenCalled();

    setHeight(400);
    screen = 'icon';
    flushSync();

    expect(animate).toHaveBeenCalledWith(
      [
        { height: '100px', overflow: 'clip' },
        { height: '400px', overflow: 'clip' },
      ],
      expect.objectContaining({ duration: SCREEN_MS }),
    );
    cleanup();
  });

  it('moves nothing when the second screen is not taller than the main one', () => {
    setReducedMotion(false);
    const { box, animate } = boxOf();
    let screen = $state<string | null>(null);

    const cleanup = $effect.root(() => {
      $effect(() => followScreenHeight(() => screen)(box));
    });
    flushSync();
    screen = 'icon';
    flushSync();

    expect(animate).not.toHaveBeenCalled();
    cleanup();
  });

  it('moves nothing for a person who asked for less motion', () => {
    setReducedMotion(true);
    const { box, animate, setHeight } = boxOf();
    let screen = $state<string | null>(null);

    const cleanup = $effect.root(() => {
      $effect(() => followScreenHeight(() => screen)(box));
    });
    flushSync();
    setHeight(400);
    screen = 'icon';
    flushSync();

    expect(animate).not.toHaveBeenCalled();
    cleanup();
  });
});
