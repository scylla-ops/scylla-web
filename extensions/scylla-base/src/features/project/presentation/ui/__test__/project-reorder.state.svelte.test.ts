import { describe, it, expect } from 'vitest';
import { PINS, UNGROUPED } from '../../presenters/project-sections.presenter.ts';
import { createProjectReorder } from '../project-reorder.state.svelte.ts';

const BOX = { left: 416, top: 100, width: 400, height: 300 };

/** The mode on, and « b » taken at its right edge, with « c » after it. */
const picked = (from = UNGROUPED) => {
  const reorder = createProjectReorder();
  reorder.start();
  reorder.pick({ id: 'b', name: 'B', from, box: BOX, grab: { x: 390, y: 40 } }, 'c');
  return reorder;
};

describe('createProjectReorder', () => {
  it('shows the slot at the place of the card when it lifts, and moves the card with the pointer', () => {
    const reorder = picked();

    expect(reorder.target).toEqual({ to: UNGROUPED, beforeId: 'c', header: false });
    expect(reorder.offset).toEqual({ x: 0, y: 0 });
    expect(reorder.motion).toBe('follow');

    reorder.follow({ x: 406, y: 150 });

    expect(reorder.offset).toEqual({ x: -400, y: 10 });
  });

  it('keeps a drop on the page, and ends the drag', () => {
    const reorder = picked();
    reorder.hover(UNGROUPED, 'a');
    reorder.drop();

    expect(reorder.moves).toEqual([{ id: 'b', to: UNGROUPED, beforeId: 'a' }]);
    expect(reorder.drag).toBeNull();
    expect(reorder.ended).toEqual({ id: 'b', name: 'B', to: UNGROUPED });
  });

  it('keeps no drop at the place where the card was', () => {
    const reorder = picked();
    reorder.hover(UNGROUPED, 'a');
    reorder.hover(UNGROUPED, 'c');
    reorder.drop();

    expect(reorder.moves).toEqual([]);
  });

  it('sends the slot back with Escape, and keeps no drop', () => {
    const reorder = picked();
    reorder.hover('g-1', 'x');
    reorder.cancel();

    expect(reorder.target).toEqual({ to: UNGROUPED, beforeId: 'c', header: false });

    reorder.release();

    expect(reorder.moves).toEqual([]);
    expect(reorder.ended).toEqual({ id: 'b', name: 'B', to: null });
  });

  it('settles the card on its slot: it stops following the pointer, and the slot stays', () => {
    const reorder = picked();
    reorder.hover(UNGROUPED, 'a');
    reorder.settle({ x: 0, y: 100 });

    expect(reorder.motion).toBe('settle');
    expect(reorder.offset).toEqual({ x: -416, y: 0 });

    reorder.follow({ x: 900, y: 900 });
    reorder.hover(UNGROUPED, 'c');

    expect(reorder.offset).toEqual({ x: -416, y: 0 });
    expect(reorder.target?.beforeId).toBe('a');
  });

  it('lets the card vanish into the header of a closed section', () => {
    const reorder = picked();
    reorder.hover('g-1', undefined, true);
    reorder.settle({ x: 0, y: 0 }, true);

    expect(reorder.motion).toBe('vanish');
  });

  it('moves a pinned card in the pins only', () => {
    const reorder = picked(PINS);

    expect(reorder.hover('g-1', 'x')).toBe(false);
    expect(reorder.hover(PINS)).toBe(true);
  });

  it('takes no drop on the pins of a card that they have: the slot goes back to the card', () => {
    const reorder = createProjectReorder(id => id === 'b');
    reorder.start();
    reorder.pick({ id: 'b', name: 'B', from: UNGROUPED, box: BOX, grab: { x: 1, y: 1 } }, 'c');
    reorder.hover('g-1', 'x');

    expect(reorder.accepts(PINS)).toBe(false);
    expect(reorder.hover(PINS)).toBe(false);

    reorder.refuse(PINS);

    expect(reorder.refused).toBe(PINS);
    expect(reorder.target).toEqual({ to: UNGROUPED, beforeId: 'c', header: false });

    reorder.drop();

    expect(reorder.moves).toEqual([]);
    expect(reorder.refused).toBeNull();
  });

  it('takes a drop on the pins of a card that they have not', () => {
    const reorder = createProjectReorder(() => false);
    reorder.start();
    reorder.pick({ id: 'b', name: 'B', from: UNGROUPED, box: BOX, grab: { x: 1, y: 1 } }, 'c');

    expect(reorder.hover(PINS)).toBe(true);
  });
});
