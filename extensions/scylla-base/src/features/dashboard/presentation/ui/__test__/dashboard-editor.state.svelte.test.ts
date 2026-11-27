import { afterEach, describe, expect, it } from 'vitest';
import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { widgetDragNews } from '@base/features/dashboard/presentation/presenters/widget-drag.presenter.ts';
import { dashboardEditor } from '../dashboard-editor.state.svelte.ts';

const WIDGETS: LayoutWidget[] = [
  { id: 'a', data: 'summary', size: 'l' },
  { id: 'b', data: 'success-rate', size: 's' },
  { id: 'c', data: 'runs', size: 'm' },
];

const ids = () => dashboardEditor.widgets.map(item => item.id);
const news = () =>
  widgetDragNews({
    drag: dashboardEditor.drag,
    over: dashboardEditor.over,
    moved: dashboardEditor.moved,
    count: dashboardEditor.widgets.length,
    ended: dashboardEditor.ended,
  });
/** The edit mode, and « b » taken by its handle. */
const picked = () => {
  dashboardEditor.start('d-1', WIDGETS);
  dashboardEditor.pick({ from: 'grid', id: 'b', data: 'success-rate', size: 's', label: 'B' });
};

afterEach(() => dashboardEditor.stop());

describe('the pointer drag of the edit mode', () => {
  it('shows the slot at the place of the widget, and moves it there at the drop', () => {
    picked();

    expect(dashboardEditor.over).toBe(1);
    expect(dashboardEditor.moved).toBe(false);
    expect(news()).toBe('“B” is picked up, at place 2 of 3');

    dashboardEditor.setOver(0);

    expect(dashboardEditor.moved).toBe(true);
    expect(news()).toBe('“B”: place 1 of 3');

    expect(dashboardEditor.drop()).toBe('b');
    expect(ids()).toEqual(['b', 'a', 'c']);
    expect(dashboardEditor.changes).toBe(1);
    expect(news()).toBe('“B” is now at place 1 of 3');
  });

  it('keeps the place while the ghost flies into its slot', () => {
    picked();
    dashboardEditor.setOver(2);
    dashboardEditor.settle();
    dashboardEditor.setOver(0);
    dashboardEditor.cancel();

    expect(dashboardEditor.over).toBe(2);
    expect(dashboardEditor.drop()).toBe('b');
    expect(ids()).toEqual(['a', 'c', 'b']);
  });

  it('makes no change for a drop at its own place or after a cancel', () => {
    picked();
    dashboardEditor.setOver(0);
    dashboardEditor.cancel();

    expect(dashboardEditor.over).toBe(1);
    expect(dashboardEditor.drop()).toBeNull();
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(dashboardEditor.changes).toBe(0);
    expect(news()).toBe('“B” is back at its place');
  });

  it('adds a kind of the palette where it lands, and nothing out of the grid', () => {
    dashboardEditor.start('d-1', WIDGETS);
    const kind = { from: 'palette', data: 'agents', size: 's', label: 'Agents' } as const;
    dashboardEditor.pick(kind);

    expect(dashboardEditor.over).toBeNull();
    expect(news()).toBe('');
    expect(dashboardEditor.drop()).toBeNull();
    expect(dashboardEditor.widgets).toHaveLength(3);

    dashboardEditor.pick(kind);
    dashboardEditor.setOver(1);

    expect(news()).toBe('“Agents”: place 2 of 4');

    const id = dashboardEditor.drop();

    expect(dashboardEditor.widgets[1]).toMatchObject({ id, data: 'agents', size: 's' });
    expect(dashboardEditor.selected).toBe(id);
  });
});

describe('the keyboard drag of the edit mode', () => {
  it('lifts a widget, moves it with the arrow keys, and drops it at its new place', () => {
    dashboardEditor.start('d-1', WIDGETS);
    dashboardEditor.lift('a', 'A');

    expect(news()).toBe(
      '“A” is lifted, at place 1 of 3. The arrow keys move it, Space drops it, and Escape cancels.',
    );

    dashboardEditor.step(-1);
    expect(dashboardEditor.over).toBe(0);

    dashboardEditor.step(1);
    dashboardEditor.step(1);
    dashboardEditor.step(1);
    expect(dashboardEditor.over).toBe(2);
    // The pointer does not move a widget that the keyboard holds.
    dashboardEditor.setOver(0);
    expect(news()).toBe('“A”: place 3 of 3');

    dashboardEditor.drop();

    expect(ids()).toEqual(['b', 'c', 'a']);
  });

  it('gives the widget its place back with Escape', () => {
    dashboardEditor.start('d-1', WIDGETS);
    dashboardEditor.lift('c', 'C');
    dashboardEditor.step(-1);
    dashboardEditor.restore();

    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(dashboardEditor.drag).toBeNull();
    expect(news()).toBe('“C” is back at its place');
  });

  it('lifts one widget at a time, and none out of the edit mode', () => {
    dashboardEditor.lift('a', 'A');
    expect(dashboardEditor.drag).toBeNull();

    picked();
    dashboardEditor.lift('a', 'A');

    expect(dashboardEditor.drag).toMatchObject({ id: 'b' });
  });
});
