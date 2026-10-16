import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
  createQuickAdd,
  menuPosition,
  MENU_SIZE,
  type QuickAdd,
  type QuickAddRequest,
} from './quick-add.state.svelte.ts';
import { BLANK_STEPS, catalogText } from '../catalog.ts';

const request: QuickAddRequest = {
  client: { x: 10, y: 20 },
  flow: { x: 1, y: 2 },
  link: { after: 'build' },
};

const withQuickAdd = (run: (quickAdd: QuickAdd, onPick: ReturnType<typeof vi.fn>) => void) => {
  const onPick = vi.fn();
  const cleanup = $effect.root(() => {
    const quickAdd = createQuickAdd({ entries: () => BLANK_STEPS, resolve: catalogText, onPick });
    flushSync();
    run(quickAdd, onPick);
  });
  cleanup();
};

describe('createQuickAdd', () => {
  it('picks nothing while it is closed', () => {
    withQuickAdd((quickAdd, onPick) => {
      quickAdd.pick();
      expect(onPick).not.toHaveBeenCalled();
    });
  });

  it('picks the active entry for the request, then closes', () => {
    withQuickAdd((quickAdd, onPick) => {
      quickAdd.open(request);
      quickAdd.move(1);
      quickAdd.pick();

      expect(onPick).toHaveBeenCalledWith(BLANK_STEPS[1], request);
      expect(quickAdd.request).toBeNull();
    });
  });

  it('wraps around both ends of the list', () => {
    withQuickAdd(quickAdd => {
      quickAdd.open(request);
      quickAdd.move(-1);
      expect(quickAdd.active).toBe(BLANK_STEPS.length - 1);
      quickAdd.move(1);
      expect(quickAdd.active).toBe(0);
    });
  });

  it('filters by the search and starts again from the first result', () => {
    withQuickAdd((quickAdd, onPick) => {
      quickAdd.open(request);
      quickAdd.move(2);
      quickAdd.query = 'command';

      expect(quickAdd.results.map(entry => entry.id)).toEqual(['kind:exec']);
      expect(quickAdd.active).toBe(0);
      quickAdd.pick();
      expect(onPick).toHaveBeenCalledWith(BLANK_STEPS[2], request);
    });
  });

  it('does not move or pick when nothing matches', () => {
    withQuickAdd((quickAdd, onPick) => {
      quickAdd.open(request);
      quickAdd.query = 'kubectl';
      quickAdd.move(1);
      quickAdd.pick();

      expect(quickAdd.active).toBe(0);
      expect(onPick).not.toHaveBeenCalled();
    });
  });

  it('forgets the last search when it opens again', () => {
    withQuickAdd(quickAdd => {
      quickAdd.open(request);
      quickAdd.query = 'bash';
      quickAdd.close();
      quickAdd.open(request);

      expect(quickAdd.query).toBe('');
    });
  });

  it('moves through the results in the order of their groups', () => {
    const template = { ...BLANK_STEPS[0], id: 'template:x', group: 'templates' as const };
    const onPick = vi.fn();
    const cleanup = $effect.root(() => {
      const quickAdd = createQuickAdd({
        entries: () => [template, ...BLANK_STEPS],
        resolve: catalogText,
        onPick,
      });
      flushSync();

      expect(quickAdd.results.at(-1)).toBe(template);
      expect(quickAdd.groups.map(({ group }) => group)).toEqual(['steps', 'templates']);
    });
    cleanup();
  });
});

describe('menuPosition', () => {
  const viewport = { width: 1000, height: 800 };

  it('opens the menu next to the point', () => {
    expect(menuPosition({ x: 100, y: 100 }, viewport)).toEqual({ x: 108, y: 76 });
  });

  it('keeps the menu inside the window', () => {
    expect(menuPosition({ x: 990, y: 790 }, viewport)).toEqual({
      x: viewport.width - MENU_SIZE.width - 8,
      y: viewport.height - MENU_SIZE.height - 8,
    });
    expect(menuPosition({ x: -50, y: 0 }, viewport)).toEqual({ x: 8, y: 8 });
  });
});
