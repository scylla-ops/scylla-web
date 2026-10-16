// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SIDE_PANEL_WIDTHS, createSidePanelWidth } from '../side-panel-width.svelte.ts';

const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: key => void items.delete(key),
    clear: () => items.clear(),
    key: () => null,
    get length() {
      return items.size;
    },
  };
};

describe('createSidePanelWidth', () => {
  it('starts each mode at its own width', () => {
    const width = createSidePanelWidth(() => memoryStorage());

    expect(width.of('palette')).toBe(SIDE_PANEL_WIDTHS.palette.initial);
    expect(width.of('inspector')).toBe(SIDE_PANEL_WIDTHS.inspector.initial);
  });

  it('remembers the width of a mode for the next editor', () => {
    const storage = memoryStorage();
    createSidePanelWidth(() => storage).set('inspector', 640);

    const next = createSidePanelWidth(() => storage);
    expect(next.of('inspector')).toBe(640);
    expect(next.of('palette')).toBe(SIDE_PANEL_WIDTHS.palette.initial);
  });

  it('ignores a stored width out of bounds, or unreadable', () => {
    const outOfBounds = memoryStorage({
      'scylla.blueprint.side-panel-width': JSON.stringify({ inspector: 5 }),
    });
    expect(createSidePanelWidth(() => outOfBounds).of('inspector')).toBe(
      SIDE_PANEL_WIDTHS.inspector.initial,
    );

    const garbage = memoryStorage({ 'scylla.blueprint.side-panel-width': '{' });
    expect(createSidePanelWidth(() => garbage).of('palette')).toBe(
      SIDE_PANEL_WIDTHS.palette.initial,
    );
  });

  it('still resizes when the browser blocks the storage', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    const width = createSidePanelWidth(blocked);

    width.set('palette', 300);
    expect(width.of('palette')).toBe(300);
  });
});
