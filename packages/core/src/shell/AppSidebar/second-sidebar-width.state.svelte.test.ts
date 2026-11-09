import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createSecondSidebarWidth,
  type SecondSidebarWidth,
} from './second-sidebar-width.state.svelte.ts';

const KEY = 'scylla.shell.second-sidebar-width';
const WIDE_WINDOW = 1920;

let cleanup = () => {};

const widthIn = (viewport: () => number): SecondSidebarWidth => {
  let width!: SecondSidebarWidth;
  cleanup = $effect.root(() => {
    width = createSecondSidebarWidth(viewport);
  });
  return width;
};

const stored = () => localStorage.getItem(KEY);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('createSecondSidebarWidth', () => {
  it('starts at the default width when the browser has no width', () => {
    const width = widthIn(() => WIDE_WINDOW);

    expect(width.current).toBe(200);
    expect(width.default).toBe(200);
    expect(width.min).toBe(140);
    expect(width.max).toBe(400);
  });

  it('starts at the width that the browser keeps', () => {
    localStorage.setItem(KEY, '312');

    expect(widthIn(() => WIDE_WINDOW).current).toBe(312);
  });

  it.each(['wide', '', 'Infinity'])('starts at the default width for a stored %j', value => {
    localStorage.setItem(KEY, value);

    expect(widthIn(() => WIDE_WINDOW).current).toBe(200);
  });

  it('keeps a stored width between the limits', () => {
    localStorage.setItem(KEY, '90');
    expect(widthIn(() => WIDE_WINDOW).current).toBe(140);

    cleanup();
    localStorage.setItem(KEY, '5000');
    expect(widthIn(() => WIDE_WINDOW).current).toBe(400);
  });

  it('keeps a stored width below the default width', () => {
    localStorage.setItem(KEY, '160');

    expect(widthIn(() => WIDE_WINDOW).current).toBe(160);
  });

  it('stops a resize at the minimum and at the maximum', () => {
    const width = widthIn(() => WIDE_WINDOW);

    width.resize(100);
    expect(width.current).toBe(140);

    width.resize(900);
    expect(width.current).toBe(400);
  });

  it('gives a width in whole pixels', () => {
    const width = widthIn(() => WIDE_WINDOW);

    width.resize(250.6);

    expect(width.current).toBe(251);
  });

  it('keeps 704 px for the page in a narrow window, then gives the width back', () => {
    localStorage.setItem(KEY, '400');
    let viewport = $state(WIDE_WINDOW);
    const width = widthIn(() => viewport);
    expect(width.current).toBe(400);

    viewport = 1024;
    flushSync();
    expect(width.max).toBe(264);
    expect(width.current).toBe(264);

    viewport = WIDE_WINDOW;
    flushSync();
    expect(width.current).toBe(400);
  });

  it('never lowers the maximum below the default width, and a resize can still go below it', () => {
    const width = widthIn(() => 800);

    expect(width.max).toBe(200);
    expect(width.current).toBe(200);

    width.resize(150);
    expect(width.current).toBe(150);
  });

  it('writes to the browser only on a save', () => {
    const width = widthIn(() => WIDE_WINDOW);

    width.resize(280);
    expect(stored()).toBeNull();

    width.save();
    expect(stored()).toBe('280');
  });

  it('is dragging from a resize to the save that ends the drag', () => {
    const width = widthIn(() => WIDE_WINDOW);
    expect(width.dragging).toBe(false);

    width.resize(280);
    expect(width.dragging).toBe(true);

    width.save();
    expect(width.dragging).toBe(false);
  });

  it('only forgets the width when the storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    let width!: SecondSidebarWidth;
    cleanup = $effect.root(() => {
      width = createSecondSidebarWidth(
        () => WIDE_WINDOW,
        () => blocked,
      );
    });

    expect(width.current).toBe(200);
    width.resize(280);
    expect(() => {
      width.save();
    }).not.toThrow();
    expect(width.current).toBe(280);
  });
});
