import { describe, it, expect } from 'vitest';
import {
  PINS,
  reorderNews,
  UNGROUPED,
  type DropTarget,
} from '../../presenters/project-sections.presenter.ts';
import {
  createProjectReorder,
  type ProjectReorderOptions,
} from '../project-reorder.state.svelte.ts';

const BOX = { left: 416, top: 100, width: 400, height: 300 };
const ORDERS: Record<string, string[]> = {
  [PINS]: ['p'],
  'g-1': ['x'],
  [UNGROUPED]: ['a', 'b', 'c'],
};
const NAMES: Record<string, string> = {
  [PINS]: 'Pinned',
  'g-1': 'Deploys',
  [UNGROUPED]: 'No group',
};
const before = (to: string, beforeId?: string): DropTarget => ({ to, beforeId, header: false });

/** The mode on, and « b » taken, with « c » after it. */
const picked = (from = UNGROUPED, options: ProjectReorderOptions = {}, keyboard = false) => {
  const reorder = createProjectReorder(options);
  reorder.start();
  reorder.pick({ id: 'b', name: 'B', from, box: BOX }, 'c', keyboard);
  return reorder;
};

const newsOf = (reorder: ReturnType<typeof createProjectReorder>) =>
  reorderNews({
    drag: reorder.drag,
    target: reorder.target,
    origin: reorder.origin,
    refused: reorder.refused,
    ended: reorder.ended,
    idsOf: key => ORDERS[key] ?? [],
    nameOf: key => NAMES[key] ?? key,
  });

describe('createProjectReorder with a pointer', () => {
  it('shows the slot at the place of the card when it lifts, with no move yet', () => {
    const reorder = picked();

    expect(reorder.target).toEqual(before(UNGROUPED, 'c'));
    expect(reorder.origin).toEqual(before(UNGROUPED, 'c'));
    expect(reorder.moved).toBe(false);
    expect(newsOf(reorder)).toBe('“B” is picked up, at place 2 of 3 in No group');
  });

  it('keeps a drop on the page, and ends the drag', () => {
    const reorder = picked();
    reorder.aim(UNGROUPED, before(UNGROUPED, 'a'));

    expect(reorder.moved).toBe(true);
    expect(newsOf(reorder)).toBe('“B”: place 1 of 3 in No group');

    reorder.drop();

    expect(reorder.moves).toEqual([{ id: 'b', to: UNGROUPED, beforeId: 'a' }]);
    expect(reorder.drag).toBeNull();
    expect(reorder.ended).toEqual({ id: 'b', name: 'B', to: UNGROUPED });
  });

  it('keeps no drop at the place where the card was, and says that it is back', () => {
    const reorder = picked();
    reorder.aim(UNGROUPED, before(UNGROUPED, 'a'));
    reorder.aim(UNGROUPED, before(UNGROUPED, 'c'));

    expect(reorder.moved).toBe(false);

    reorder.drop();

    expect(reorder.moves).toEqual([]);
    expect(reorder.ended).toEqual({ id: 'b', name: 'B', to: null });
    expect(newsOf(reorder)).toBe('“B” is back at its place');
  });

  it('sends the slot back with Escape, and keeps no drop', () => {
    const reorder = picked();
    reorder.aim('g-1', before('g-1', 'x'));
    reorder.cancel();

    expect(reorder.target).toEqual(before(UNGROUPED, 'c'));

    reorder.release();

    expect(reorder.moves).toEqual([]);
    expect(reorder.ended).toEqual({ id: 'b', name: 'B', to: null });
  });

  it('sends the slot back out of each section', () => {
    const reorder = picked();
    reorder.aim('g-1', before('g-1', 'x'));
    reorder.aim(null, null);

    expect(reorder.target).toEqual(before(UNGROUPED, 'c'));
    expect(reorder.moved).toBe(false);
  });

  it('keeps the place while the card flies into its slot', () => {
    const reorder = picked();
    reorder.aim(UNGROUPED, before(UNGROUPED, 'a'));
    reorder.settle();
    reorder.aim(UNGROUPED, before(UNGROUPED, 'c'));
    reorder.cancel();

    expect(reorder.settling).toBe(true);
    expect(reorder.target?.beforeId).toBe('a');

    reorder.drop();

    expect(reorder.moves).toEqual([{ id: 'b', to: UNGROUPED, beforeId: 'a' }]);
    expect(reorder.settling).toBe(false);
  });

  it('tells a section that shows no card: the drop puts the card last there', () => {
    const reorder = picked();
    reorder.aim('g-1', { to: 'g-1', header: true });

    expect(newsOf(reorder)).toBe('Release to move “B” into Deploys');

    reorder.drop();

    expect(reorder.moves).toEqual([{ id: 'b', to: 'g-1', beforeId: undefined }]);
  });

  it('moves a pinned card in the pins only', () => {
    const reorder = picked(PINS);

    expect(reorder.accepts('g-1')).toBe(false);

    reorder.aim('g-1', before('g-1', 'x'));

    expect(reorder.target).toEqual(before(PINS, 'c'));
    expect(reorder.refused).toBeNull();

    reorder.aim(PINS, before(PINS));

    expect(reorder.target).toEqual(before(PINS));
  });

  it('says that the pins have a pinned card, and takes no drop of it there', () => {
    const reorder = picked(UNGROUPED, { isPinned: id => id === 'b' });
    reorder.aim(PINS, before(PINS, 'p'));

    expect(reorder.accepts(PINS)).toBe(false);
    expect(reorder.refused).toBe(PINS);
    expect(reorder.target).toEqual(before(UNGROUPED, 'c'));
    expect(newsOf(reorder)).toBe('“B” is already pinned');

    reorder.aim('g-1', before('g-1', 'x'));

    expect(reorder.refused).toBeNull();

    reorder.aim(PINS, before(PINS));
    reorder.drop();

    expect(reorder.moves).toEqual([]);
    expect(reorder.refused).toBeNull();
  });

  it('says that the group of a card of the pins has it', () => {
    const reorder = picked(PINS, { isPinned: () => true, homeOf: () => 'g-1' });
    reorder.aim('g-1', before('g-1', 'x'));

    expect(reorder.refused).toBe('g-1');
    expect(newsOf(reorder)).toBe('“B” is already in Deploys');

    reorder.aim(UNGROUPED, before(UNGROUPED, 'a'));

    expect(reorder.refused).toBeNull();
    expect(reorder.target).toEqual(before(PINS, 'c'));
  });

  it('takes a drop on the pins of a card that they do not have, and then has it there', () => {
    const reorder = picked();
    reorder.aim(PINS, before(PINS));
    reorder.drop();

    expect(reorder.moves).toEqual([{ id: 'b', to: PINS, beforeId: undefined }]);

    reorder.pick({ id: 'b', name: 'B', from: UNGROUPED, box: BOX }, 'c');
    reorder.aim(PINS, before(PINS));

    expect(reorder.refused).toBe(PINS);
  });
});

describe('createProjectReorder with the keyboard', () => {
  const layout = () => [
    { key: PINS, open: true, ids: ['p'] },
    { key: 'g-1', open: false, ids: ['x'] },
    { key: UNGROUPED, open: true, ids: ['a', 'b', 'c'] },
  ];

  it('holds the card in its place and tells the keys', () => {
    const reorder = picked(UNGROUPED, { layout }, true);

    expect(reorder.drag?.keyboard).toBe(true);
    expect(newsOf(reorder)).toBe(
      '“B” is lifted, at place 2 of 3 in No group. The arrow keys move it, Space drops it, and Escape cancels.',
    );
  });

  it('moves the slot with the arrow keys, also into another section, then drops the card', () => {
    const reorder = picked(UNGROUPED, { layout }, true);
    reorder.step(-1);

    expect(reorder.target).toEqual(before(UNGROUPED, 'a'));

    reorder.step(-1);

    expect(reorder.target).toEqual({ to: 'g-1', header: true });

    // The pointer does not move a card that the keyboard holds.
    reorder.aim(UNGROUPED, before(UNGROUPED, 'c'));

    expect(reorder.target).toEqual({ to: 'g-1', header: true });

    reorder.drop();

    expect(reorder.moves).toEqual([{ id: 'b', to: 'g-1', beforeId: undefined }]);
  });

  it('gives the card its place back with Escape', () => {
    const reorder = picked(UNGROUPED, { layout }, true);
    reorder.step(1);
    reorder.cancel();
    reorder.release();

    expect(reorder.moves).toEqual([]);
    expect(newsOf(reorder)).toBe('“B” is back at its place');
  });
});
