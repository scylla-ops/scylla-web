import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import * as sdk from '@scylla/core-sdk';
import { warnBeforeUnload } from '../unsaved-changes.effect.svelte.ts';

afterEach(() => vi.restoreAllMocks());

describe('warnBeforeUnload', () => {
  it('asks the browser to confirm a reload only while there are unsaved changes', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    let dirty = $state(false);

    const cleanup = $effect.root(() => warnBeforeUnload(() => dirty));
    flushSync();
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));

    dirty = true;
    flushSync();
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    dirty = false;
    flushSync();
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    cleanup();
  });

  it('cancels the unload and sets returnValue, which Chrome needs to show the prompt', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const cleanup = $effect.root(() => warnBeforeUnload(() => true));
    flushSync();

    const warn = add.mock.calls.find(([type]) => type === 'beforeunload')?.[1] as (
      event: BeforeUnloadEvent,
    ) => void;
    const event = { preventDefault: vi.fn(), returnValue: 'x' } as unknown as BeforeUnloadEvent;
    warn(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
    cleanup();
  });

  it('hands a navigation in the app to `hold` while dirty, and stops holding when clean', () => {
    const stop = vi.fn();
    let ask: ((leave: () => void) => boolean) | undefined;
    vi.spyOn(sdk, 'guardLeave').mockImplementation(fn => {
      ask = fn;
      return stop;
    });
    const hold = vi.fn();
    let dirty = $state(true);
    const cleanup = $effect.root(() => warnBeforeUnload(() => dirty, hold));
    flushSync();

    const leave = vi.fn();
    expect(ask?.(leave)).toBe(true);
    expect(hold).toHaveBeenCalledWith(leave);

    dirty = false;
    flushSync();
    expect(stop).toHaveBeenCalled();
    cleanup();
  });

  it('lets a navigation go when the changes are saved just before it, before the effect runs again', () => {
    let ask: ((leave: () => void) => boolean) | undefined;
    vi.spyOn(sdk, 'guardLeave').mockImplementation(fn => {
      ask = fn;
      return vi.fn();
    });
    const hold = vi.fn();
    let dirty = $state(true);
    const cleanup = $effect.root(() => warnBeforeUnload(() => dirty, hold));
    flushSync();

    dirty = false;

    expect(ask?.(vi.fn())).toBe(false);
    expect(hold).not.toHaveBeenCalled();
    cleanup();
  });
});
