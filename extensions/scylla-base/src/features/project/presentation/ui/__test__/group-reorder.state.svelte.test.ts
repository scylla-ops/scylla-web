import { describe, it, expect } from 'vitest';
import { groupNews } from '../../presenters/project-sections.presenter.ts';
import { createGroupReorder, type GroupReorderState } from '../group-reorder.state.svelte.ts';

const BOX = { left: 0, top: 400, width: 1232, height: 40 };

/** The mode on, with the groups « a », « b » and « c ». */
const started = () => {
  const groups = createGroupReorder();
  groups.start(['a', 'b', 'c']);
  return groups;
};

const newsOf = (groups: GroupReorderState) =>
  groupNews({
    drag: groups.drag,
    order: groups.order ?? [],
    target: groups.target,
    stepped: groups.stepped,
    ended: groups.ended,
  });

describe('createGroupReorder with the keyboard', () => {
  it('lifts a group, moves it with the arrow keys and drops it at its new place', () => {
    const groups = started();

    groups.lift('c', 'C');
    expect(newsOf(groups)).toBe(
      '“C” is lifted, at place 3 of 3 in the groups. The arrow keys move it, Space drops it, and Escape cancels.',
    );

    groups.step(-1);
    groups.step(-1);
    groups.step(-1);
    expect(groups.order).toEqual(['c', 'a', 'b']);
    expect(newsOf(groups)).toBe('“C”: place 1 of 3 in the groups');

    groups.place();
    expect(groups.drag).toBeNull();
    expect(newsOf(groups)).toBe('“C” is now at place 1 of 3 in the groups');
  });

  it('gives the group its place back with Escape', () => {
    const groups = started();
    groups.lift('a', 'A');
    groups.step(1);
    groups.restore();

    expect(groups.order).toEqual(['a', 'b', 'c']);
    expect(newsOf(groups)).toBe('“A” is back at its place');
  });

  it('moves no group out of the reorder mode', () => {
    const groups = createGroupReorder();
    groups.lift('a', 'A');
    groups.moveTo('a', 1);

    expect(groups.active).toBe(false);
    expect(groups.drag).toBeNull();
    expect(groups.order).toBeNull();
  });

  it('moves a group from its menu, and forgets the order when the mode ends', () => {
    const groups = started();
    groups.moveTo('a', 2);

    expect(groups.order).toEqual(['b', 'c', 'a']);

    groups.stop();

    expect(groups.order).toBeNull();
  });
});

describe('createGroupReorder with a pointer', () => {
  /** « b » taken by its handle, with « c » after it. */
  const picked = () => {
    const groups = started();
    groups.pick({ id: 'b', name: 'B', box: BOX }, 'c');
    return groups;
  };

  it('shows no line at the place of the group, and keeps the groups in their place', () => {
    const groups = picked();

    expect(groups.target).toEqual({ beforeId: 'c' });
    expect(groups.moved).toBe(false);
    expect(newsOf(groups)).toBe('“B”: place 2 of 3 in the groups');

    groups.hover({ beforeId: 'a' });

    expect(groups.moved).toBe(true);
    expect(groups.order).toEqual(['a', 'b', 'c']);
    expect(newsOf(groups)).toBe('“B”: place 1 of 3 in the groups');
  });

  it('moves the group to the line at the drop, then ends the drag when the copy is on the header', () => {
    const groups = picked();
    groups.hover({ beforeId: 'a' });

    expect(groups.drop()).toBe(true);
    expect(groups.order).toEqual(['b', 'a', 'c']);
    expect(groups.settling).toBe(true);
    expect(groups.moved).toBe(false);

    // The line does not come back while the copy flies.
    groups.hover({ beforeId: 'c' });
    expect(groups.target).toBeNull();

    groups.finish(true);

    expect(groups.drag).toBeNull();
    expect(newsOf(groups)).toBe('“B” is now at place 1 of 3 in the groups');
  });

  it('sends the line back with Escape, and keeps the order', () => {
    const groups = picked();
    groups.hover({});
    groups.cancel();

    expect(groups.target).toEqual({ beforeId: 'c' });
    expect(groups.drop()).toBe(false);

    groups.finish(false);

    expect(groups.order).toEqual(['a', 'b', 'c']);
    expect(newsOf(groups)).toBe('“B” is back at its place');
  });

  it('keeps the order for a drop at the place of the group', () => {
    const groups = picked();
    groups.hover({ beforeId: 'a' });
    groups.hover({ beforeId: 'c' });

    expect(groups.drop()).toBe(false);
    expect(groups.order).toEqual(['a', 'b', 'c']);
  });

  it('lifts one group at a time', () => {
    const groups = picked();
    groups.lift('a', 'A');
    groups.pick({ id: 'c', name: 'C', box: BOX });

    expect(groups.drag?.id).toBe('b');
  });
});
