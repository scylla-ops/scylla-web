// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MAX_PINS } from '@base/features/project/domain/structs/project-layout.struct.ts';
import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import {
  applyMoves,
  cardTargetAt,
  groupMovesToSave,
  groupTargetAt,
  inGroupOrder,
  keyboardTargets,
  moveGroupTo,
  movesToSave,
  neighborsOf,
  PINS,
  searchSectionOf,
  sectionHealth,
  slotPlace,
  stepGroup,
  stepTarget,
  UNGROUPED,
  type DropTarget,
  type KeyboardSection,
  type SectionZone,
} from '../project-sections.presenter.ts';

const ORDERS = { [PINS]: ['c'], 'g-1': ['a', 'b'], [UNGROUPED]: ['c', 'd'] };

describe('applyMoves', () => {
  it('moves a card out of its old group and before a card of the new one', () => {
    const next = applyMoves(ORDERS, [{ id: 'd', to: 'g-1', beforeId: 'b' }]);

    expect(next).toEqual({ [PINS]: ['c'], 'g-1': ['a', 'd', 'b'], [UNGROUPED]: ['c'] });
  });

  it('pins a card and keeps it in its group, then applies the next drops in their order', () => {
    const next = applyMoves(ORDERS, [
      { id: 'a', to: PINS, beforeId: 'c' },
      { id: 'b', to: UNGROUPED },
    ]);

    expect(next).toEqual({ [PINS]: ['a', 'c'], 'g-1': ['a'], [UNGROUPED]: ['c', 'd', 'b'] });
  });

  it('adds no pin over 100, and does not change the orders that it gets', () => {
    const pins = Array.from({ length: MAX_PINS }, (_, index) => `p-${index}`);
    const orders = { [PINS]: pins, [UNGROUPED]: ['x'] };

    expect(applyMoves(orders, [{ id: 'x', to: PINS }])[PINS]).toEqual(pins);
    expect(applyMoves(ORDERS, [{ id: 'a', to: 'g-2' }])['g-2']).toEqual(['a']);
    expect(ORDERS['g-1']).toEqual(['a', 'b']);
  });
});

describe('movesToSave', () => {
  it('gives one MoveProject for each drop out of the pins, in their order', () => {
    expect(
      movesToSave([
        { id: 'a', to: PINS },
        { id: 'b', to: 'g-1', beforeId: 'a' },
        { id: 'c', to: UNGROUPED },
      ]),
    ).toEqual([{ id: 'b', groupId: 'g-1', beforeId: 'a' }, { id: 'c' }]);
  });
});

describe('the places of the cards', () => {
  it('gives the cards before and after a card', () => {
    expect(neighborsOf(['a', 'b', 'c'], 'b')).toEqual({ previous: 'a', next: 'c' });
    expect(neighborsOf(['a', 'b'], 'a')).toEqual({ previous: undefined, next: 'b' });
    expect(neighborsOf(['a'], 'gone')).toEqual({});
  });

  it('counts the place of the slot from 1, with the dragged card', () => {
    expect(slotPlace(['a', 'b', 'c'], 'c', 'a')).toEqual({ place: 1, count: 3 });
    expect(slotPlace(['a', 'b', 'c'], 'c')).toEqual({ place: 3, count: 3 });
    expect(slotPlace(['a', 'b'], 'x', 'b')).toEqual({ place: 2, count: 3 });
  });
});

/** A grid of 3 columns: cards of 400 × 300 px, 16 px apart, under a header of 32 px. */
const W = 400;
const H = 300;
const GAP = 16;
const GRID_TOP = 44;
/**
 * A section at `top`: its cells in the order of the grid, `null` for the slot of the dragged card,
 * and the free cell after the last cell in its box.
 */
const zone = (key: string, places: (string | null)[], top = 0): SectionZone => {
  const rows = Math.ceil((places.length + 1) / 3);
  return {
    key,
    box: { left: 0, top, width: 1232, height: GRID_TOP + rows * (H + GAP) },
    open: true,
    cells: places.flatMap((id, index) =>
      id === null
        ? []
        : [
            {
              id,
              box: {
                left: (index % 3) * (W + GAP),
                top: top + GRID_TOP + Math.floor(index / 3) * (H + GAP),
                width: W,
                height: H,
              },
            },
          ],
    ),
    columns: 3,
  };
};
/** A folded section: its header and its line of chips. */
const folded = (key: string, top: number): SectionZone => ({
  key,
  box: { left: 0, top, width: 1232, height: 80 },
  open: false,
  cells: [],
  columns: 3,
});
const any = () => true;
const last = (to: string): DropTarget => ({ to, header: false });

describe('the target of a dragged card', () => {
  // The pins at 0 px (360 px high), « No group » at 500 px, with the slot of the dragged card.
  const page = [zone(PINS, ['p']), zone(UNGROUPED, ['x', null, 'y'], 500)];

  it('takes the pins as soon as the pointer is over them, wherever the person took the card', () => {
    // Near the bottom of the pins, and just under them: the card can be much lower.
    expect(cardTargetAt(page, { x: 300, y: 350 }, any, last(UNGROUPED)).target).toEqual({
      to: PINS,
      beforeId: undefined,
      header: false,
    });
    expect(cardTargetAt(page, { x: 600, y: 380 }, any, last(UNGROUPED)).over).toBe(PINS);
    // Over the top of « p »: before it.
    expect(cardTargetAt(page, { x: 100, y: 60 }, any, null).target?.beforeId).toBe('p');
  });

  it('takes a section in a margin around it, and nothing far from each section', () => {
    // 20 px over « No group », 120 px under the pins.
    expect(cardTargetAt(page, { x: 200, y: 480 }, any, null).over).toBe(UNGROUPED);
    expect(cardTargetAt(page, { x: 200, y: 3000 }, any, null)).toEqual({
      over: null,
      target: null,
    });
  });

  it('keeps the section of the slot on the line between two sections', () => {
    const near = [zone(PINS, ['p']), zone(UNGROUPED, ['x'], 368)];
    // 2 px under the pins and 6 px over « No group ».
    const point = { x: 200, y: 362 };

    expect(cardTargetAt(near, point, any, null).over).toBe(PINS);
    expect(cardTargetAt(near, point, any, last(UNGROUPED)).over).toBe(UNGROUPED);
  });

  it('puts the card before a card when the pointer is on the first half of it', () => {
    // « test », then the slot of « live-test », which comes from another section.
    const row = [zone(UNGROUPED, ['test', null])];

    expect(cardTargetAt(row, { x: 0.45 * W, y: 100 }, any, null).target?.beforeId).toBe('test');
    expect(cardTargetAt(row, { x: 0.55 * W, y: 100 }, any, null).target?.beforeId).toBeUndefined();
  });

  it('moves the slot back only when the pointer passes three quarters of a card', () => {
    // a b c / d [the slot of « e »]: the slot is last.
    const before = [zone('g-1', ['a', 'b', 'c', 'd', null])];
    const at = (x: number, y = GRID_TOP + H + GAP + 100) =>
      cardTargetAt(before, { x, y }, any, last('g-1')).target?.beforeId;

    expect(at(0.3 * W)).toBeUndefined();
    expect(at(0.2 * W)).toBe('d');
    // On the first row, over « b »: before it.
    expect(at(W + GAP + 0.2 * W, GRID_TOP + 100)).toBe('b');

    // a b c / [the slot] d: the slot is before « d ».
    const after = [zone('g-1', ['a', 'b', 'c', null, 'd'])];
    const slot: DropTarget = { to: 'g-1', beforeId: 'd', header: false };
    const on = (x: number) =>
      cardTargetAt(after, { x, y: GRID_TOP + H + GAP + 100 }, any, slot).target?.beforeId;

    expect(on(W + GAP + 0.6 * W)).toBe('d');
    expect(on(W + GAP + 0.8 * W)).toBeUndefined();
  });

  it('puts the card last in a section that shows no card, also over its header', () => {
    const closed = [zone(PINS, ['p']), folded('g-2', 400)];

    expect(cardTargetAt(closed, { x: 900, y: 410 }, any, null)).toEqual({
      over: 'g-2',
      target: { to: 'g-2', header: true },
    });
  });

  it('puts the card last in an open section with no card', () => {
    expect(cardTargetAt([zone('g-2', [])], { x: 600, y: 100 }, any, null).target).toEqual({
      to: 'g-2',
      beforeId: undefined,
      header: false,
    });
  });

  it('tells the section under the pointer that takes no drop of the card, with no target', () => {
    const onlyPins = (key: string) => key === PINS;

    expect(cardTargetAt(page, { x: 200, y: 700 }, onlyPins, null)).toEqual({
      over: UNGROUPED,
      target: null,
    });
  });
});

describe('the keyboard places of a card', () => {
  const sections: KeyboardSection[] = [
    { key: PINS, open: true, ids: ['p'] },
    { key: 'g-1', open: false, ids: ['a'] },
    { key: UNGROUPED, open: true, ids: ['b', 'c'] },
  ];
  const noPins = (key: string) => key !== PINS;
  const targets = keyboardTargets(sections, 'b', noPins);

  it('gives each place of each open section, and one place in a folded section', () => {
    expect(targets).toEqual([
      { to: 'g-1', header: true },
      { to: UNGROUPED, beforeId: 'c', header: false },
      { to: UNGROUPED, header: false },
    ]);
  });

  it('moves one place back or on, also into the next section, and stops at each end', () => {
    const origin: DropTarget = { to: UNGROUPED, beforeId: 'c', header: false };

    expect(stepTarget(targets, origin, -1)).toEqual({ to: 'g-1', header: true });
    expect(stepTarget(targets, { to: 'g-1', header: true }, -1)).toEqual({
      to: 'g-1',
      header: true,
    });
    expect(stepTarget(targets, origin, 1)).toEqual({ to: UNGROUPED, header: false });
    expect(stepTarget(targets, { to: UNGROUPED, header: false }, 1)).toEqual({
      to: UNGROUPED,
      header: false,
    });
    expect(stepTarget(targets, { to: PINS, header: false }, 1)).toEqual(targets[0]);
  });
});

describe('the sections', () => {
  it('reads a group, the projects with no group, and no section for the pins', () => {
    expect(searchSectionOf('g-1')).toEqual({ kind: 'group', groupId: 'g-1' });
    expect(searchSectionOf(UNGROUPED)).toEqual({ kind: 'ungrouped' });
    expect(searchSectionOf(PINS)).toBeUndefined();
  });

  it('shows the failures first, then the jobs that run, then the jobs that wait, else no health', () => {
    const counts = { total: 4, failed: 1, running: 2, pending: 3, pipelines: 6 };

    expect(sectionHealth(counts)).toEqual({ kind: 'failed', count: 1 });
    expect(sectionHealth({ ...counts, failed: 0 })).toEqual({ kind: 'running', count: 2 });
    expect(sectionHealth({ ...counts, failed: 0, running: 0 })).toEqual({
      kind: 'pending',
      count: 3,
    });
    expect(sectionHealth({ ...counts, failed: 0, running: 0, pending: 0 })).toBeUndefined();
  });
});

describe('the order of the groups', () => {
  const group = (id: string): ProjectGroupEntity => ({ id, workspaceId: 'org-1', name: id });
  /** The groups in one column, each 100 px high. */
  const groupCell = (index: number, id: string) => ({
    id,
    top: index * 100,
    bottom: index * 100 + 100,
  });

  it('shows the groups in the order of the reorder mode, and a new group last', () => {
    const groups = [group('a'), group('b'), group('c')];

    expect(inGroupOrder(groups, null).map(item => item.id)).toEqual(['a', 'b', 'c']);
    expect(inGroupOrder(groups, ['c', 'a']).map(item => item.id)).toEqual(['c', 'a', 'b']);
    expect(inGroupOrder(groups, ['x', 'b']).map(item => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a group one place, and not the first group up nor the last down', () => {
    expect(stepGroup(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(stepGroup(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(stepGroup(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(stepGroup(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    expect(stepGroup(['a', 'b'], 'x', 1)).toEqual(['a', 'b']);
  });

  it('puts a group at a place from 0, in the limits of the order', () => {
    expect(moveGroupTo(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveGroupTo(['a', 'b', 'c'], 'a', 9)).toEqual(['b', 'c', 'a']);
  });

  it('gives the server one write for each group that is not at its place, in their order', () => {
    expect(groupMovesToSave(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
    expect(groupMovesToSave(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      { groupId: 'c', position: 0 },
    ]);
    expect(groupMovesToSave(['a', 'b', 'c', 'd'], ['d', 'c', 'b', 'a'])).toEqual([
      { groupId: 'd', position: 0 },
      { groupId: 'c', position: 1 },
      { groupId: 'b', position: 2 },
    ]);
  });

  it('writes no group that the server does not have any more', () => {
    expect(groupMovesToSave(['a', 'b'], ['x', 'b', 'a'])).toEqual([{ groupId: 'b', position: 0 }]);
  });

  it('puts the line before the first group whose middle the pointer has not passed', () => {
    // Three groups of 100 px; « b » is dragged and stays in its place.
    const cells = [groupCell(0, 'a'), groupCell(1, 'b'), groupCell(2, 'c')];

    // Over the top of « a »: before it. Near the line between « a » and « b »: its own place.
    expect(groupTargetAt(cells, 'b', 10)).toEqual({ beforeId: 'a' });
    expect(groupTargetAt(cells, 'b', 90)).toEqual({ beforeId: 'c' });
    // On itself, and just after itself: its own place, before « c ».
    expect(groupTargetAt(cells, 'b', 160)).toEqual({ beforeId: 'c' });
    expect(groupTargetAt(cells, 'b', 210)).toEqual({ beforeId: 'c' });
    // Near the end of « c »: last.
    expect(groupTargetAt(cells, 'b', 270)).toEqual({ beforeId: undefined });
    expect(groupTargetAt(cells, 'b', 900)).toEqual({ beforeId: undefined });
    expect(groupTargetAt([], 'b', 10)).toBeNull();
  });

  it('puts the line at the nearest end of a tall group', () => {
    // « b » is 600 px high, with many cards; « c » is dragged.
    const cells = [
      { id: 'a', top: 0, bottom: 100 },
      { id: 'b', top: 100, bottom: 700 },
      { id: 'c', top: 700, bottom: 800 },
    ];

    expect(groupTargetAt(cells, 'c', 380)).toEqual({ beforeId: 'b' });
    expect(groupTargetAt(cells, 'c', 420)).toEqual({ beforeId: undefined });
  });

  it('moves the line back only when the pointer passes three quarters of a group', () => {
    const cells = [groupCell(0, 'a'), groupCell(1, 'b'), groupCell(2, 'c')];

    // The line is after « a », the place of « c »: back before « a » only over its first quarter.
    expect(groupTargetAt(cells, 'c', 40, { beforeId: 'b' })).toEqual({ beforeId: 'b' });
    expect(groupTargetAt(cells, 'c', 20, { beforeId: 'b' })).toEqual({ beforeId: 'a' });
    // The line is before « a »: after it only past its third quarter.
    expect(groupTargetAt(cells, 'c', 60, { beforeId: 'a' })).toEqual({ beforeId: 'a' });
    expect(groupTargetAt(cells, 'c', 80, { beforeId: 'a' })).toEqual({ beforeId: 'b' });
  });
});
