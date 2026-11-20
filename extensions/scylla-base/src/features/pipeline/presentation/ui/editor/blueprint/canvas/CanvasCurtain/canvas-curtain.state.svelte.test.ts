import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createCanvasCurtain, type CanvasCurtain } from './canvas-curtain.state.svelte.ts';

let cleanup: () => void = () => {};

const curtainWith = ({ reducedMotion = false } = {}) => {
  const state = $state({ ready: false, failed: false });
  let curtain!: CanvasCurtain;
  cleanup = $effect.root(() => {
    curtain = createCanvasCurtain({
      ready: () => state.ready,
      failed: () => state.failed,
      reducedMotion: () => reducedMotion,
    });
  });
  flushSync();

  const advance = (ms: number) => {
    vi.advanceTimersByTime(ms);
    flushSync();
  };
  const set = (next: Partial<typeof state>) => {
    Object.assign(state, next);
    flushSync();
  };
  return { curtain, advance, set };
};

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('createCanvasCurtain', () => {
  it('shows only the canvas for 300 ms, then the logo', () => {
    const { curtain, advance } = curtainWith();
    expect(curtain.phase).toBe('waiting');

    advance(299);
    expect(curtain.phase).toBe('waiting');

    advance(1);
    expect(curtain.phase).toBe('loading');
  });

  it('never shows the logo for a canvas that is ready within 300 ms', () => {
    const { curtain, advance, set } = curtainWith();

    advance(200);
    set({ ready: true });
    expect(curtain.revealed).toBe(true);

    advance(1000);
    expect(curtain.phase).toBe('revealed');
  });

  it('keeps the logo on screen 400 ms at least, then fades it out in 120 ms', () => {
    const { curtain, advance, set } = curtainWith();
    advance(300);
    advance(50);
    set({ ready: true });

    advance(349);
    expect(curtain.phase).toBe('loading');

    advance(1);
    expect(curtain.phase).toBe('leaving');
    expect(curtain.revealed).toBe(false);

    advance(120);
    expect(curtain.revealed).toBe(true);
  });

  it('lets the logo go at once when it was on screen long enough', () => {
    const { curtain, advance, set } = curtainWith();
    advance(1000);

    set({ ready: true });

    expect(curtain.phase).toBe('leaving');
  });

  it('says that the load is slow after 4 s', () => {
    const { curtain, advance } = curtainWith();

    advance(3999);
    expect(curtain.slow).toBe(false);

    advance(1);
    expect(curtain.slow).toBe(true);
  });

  it('removes the logo with no fade when the user prefers reduced motion', () => {
    const { curtain, advance, set } = curtainWith({ reducedMotion: true });
    advance(1000);

    set({ ready: true });

    expect(curtain.phase).toBe('revealed');
  });

  it('starts the times again for a retry after an error', () => {
    const { curtain, advance, set } = curtainWith();
    advance(5000);
    set({ failed: true });
    expect(curtain.failed).toBe(true);
    expect(curtain.revealed).toBe(false);

    set({ failed: false });

    expect(curtain.phase).toBe('waiting');
    expect(curtain.slow).toBe(false);
    advance(300);
    expect(curtain.phase).toBe('loading');
  });

  it('stays on the error while the canvas cannot be ready', () => {
    const { curtain, advance, set } = curtainWith();
    set({ failed: true });

    advance(10_000);

    expect(curtain.phase).toBe('waiting');
    expect(curtain.failed).toBe(true);
  });
});
