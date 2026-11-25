import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_LOG_DISPLAY,
  LOG_DISPLAY_KEY,
  createLogDisplay,
  decodeLogDisplay,
} from '../log-display-settings.state.svelte.ts';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('decodeLogDisplay', () => {
  it('gives the defaults for nothing saved', () => {
    expect(decodeLogDisplay(null)).toEqual(DEFAULT_LOG_DISPLAY);
    expect(decodeLogDisplay('wrap')).toEqual(DEFAULT_LOG_DISPLAY);
  });

  it('keeps the default of each value that this build cannot read', () => {
    expect(
      decodeLogDisplay({ ansi: false, wrap: 'no', size: 'xl', nodeView: 'graph', extra: 1 }),
    ).toEqual({ ...DEFAULT_LOG_DISPLAY, ansi: false, nodeView: 'graph' });
  });
});

describe('createLogDisplay', () => {
  it('starts with the colors, the wrap and the line numbers, in the medium size, with the list', () => {
    const cleanup = $effect.root(() => {
      expect(createLogDisplay().current).toEqual({
        ansi: true,
        wrap: true,
        timestamps: false,
        lineNumbers: true,
        size: 'm',
        nodeView: 'list',
      });
    });
    cleanup();
  });

  it('saves a change, and the next page reads it back', () => {
    const cleanup = $effect.root(() => {
      const display = createLogDisplay();
      display.set({ timestamps: true, size: 'l', nodeView: 'graph' });

      expect(display.current.timestamps).toBe(true);
      expect(JSON.parse(localStorage.getItem(LOG_DISPLAY_KEY) ?? '{}')).toMatchObject({
        timestamps: true,
        size: 'l',
        nodeView: 'graph',
      });
      expect(createLogDisplay().current).toEqual({
        ...DEFAULT_LOG_DISPLAY,
        timestamps: true,
        size: 'l',
        nodeView: 'graph',
      });
    });
    cleanup();
  });

  it('gives the defaults for a saved value that is not JSON', () => {
    localStorage.setItem(LOG_DISPLAY_KEY, '{not json');

    const cleanup = $effect.root(() => {
      expect(createLogDisplay().current).toEqual(DEFAULT_LOG_DISPLAY);
    });
    cleanup();
  });

  it('keeps a change until the page is left when the storage refuses it', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;

    const cleanup = $effect.root(() => {
      const display = createLogDisplay(() => blocked);
      expect(display.current).toEqual(DEFAULT_LOG_DISPLAY);

      display.set({ wrap: false });
      expect(display.current.wrap).toBe(false);
    });
    cleanup();
  });
});
