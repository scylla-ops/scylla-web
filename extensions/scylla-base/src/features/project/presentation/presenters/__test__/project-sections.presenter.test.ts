// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MAX_PINS } from '@base/features/project/domain/structs/project-layout.struct.ts';
import {
  applyMoves,
  cardTargetAt,
  movesToSave,
  neighborsOf,
  PINS,
  searchSectionOf,
  sectionHealth,
  slotPlace,
  UNGROUPED,
  type CardCell,
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
const cell = (index: number, id?: string): CardCell => ({
  id,
  box: {
    left: (index % 3) * (W + GAP),
    top: GRID_TOP + Math.floor(index / 3) * (H + GAP),
    width: W,
    height: H,
  },
});
/** A section at `top`, its header, and its grid with the free cell after the last cell. */
const zone = (key: string, cells: CardCell[], top = 0): SectionZone => {
  const down = ({ id, box }: CardCell): CardCell => ({ id, box: { ...box, top: box.top + top } });
  const rows = Math.ceil((cells.length + 1) / 3);
  return {
    key,
    header: { left: 0, top, width: 1232, height: 32 },
    body: { left: 0, top: top + 32, width: 1232, height: 12 + rows * (H + GAP) },
    cells: cells.map(down),
    after: down(cell(cells.length)).box,
  };
};
const any = () => true;
/** The center of the dragged card: the pointer holds the card at `grab`. */
const centerOf = (pointer: { x: number; y: number }, grab: { x: number; y: number }) => ({
  x: pointer.x - grab.x + W / 2,
  y: pointer.y - grab.y + H / 2,
});
const GRABS = [
  ['the left edge', 10],
  ['the center', W / 2],
  ['the right edge', W - 10],
] as const;

describe('the target of a dragged card', () => {
  // « test », then the slot of « live-test », which the person drags.
  const row = [zone(UNGROUPED, [cell(0, 'test'), cell(1)])];
  const start = row[0].cells[1].box;

  it.each(GRABS)(
    'takes the place of the card before when it covers half of it, held at %s',
    (_, x) => {
      const grab = { x, y: 40 };
      const at = (dx: number) => {
        const pointer = { x: start.left + grab.x + dx, y: start.top + grab.y };
        return cardTargetAt(row, centerOf(pointer, grab), pointer, any)?.beforeId;
      };

      expect(at(-W)).toBe('test');
      expect(at(-(W + GAP) / 2 - 4)).toBe('test');
      expect(at(-(W + GAP) / 2 + 4)).toBeUndefined();
      expect(at(-150)).toBeUndefined();
    },
  );

  it('moves the slot when the card covers a neighbor, also with the pointer over the slot', () => {
    // Held at its right edge, the card covers « test », and the pointer is still on the slot.
    const grab = { x: W - 10, y: 40 };
    const pointer = { x: start.left + 40, y: start.top + 40 };

    expect(cardTargetAt(row, centerOf(pointer, grab), pointer, any)).toEqual({
      to: UNGROUPED,
      beforeId: 'test',
      header: false,
    });
  });

  // a b c / d [the slot of « e »], which the person drags.
  const rows = [zone('g-1', [cell(0, 'a'), cell(1, 'b'), cell(2, 'c'), cell(3, 'd'), cell(4)])];
  const e = rows[0].cells[4].box;

  it.each(GRABS)('follows the card on two rows and over the gaps, held at %s', (_, x) => {
    const grab = { x, y: 200 };
    const at = (dx: number, dy: number) => {
      const pointer = { x: e.left + grab.x + dx, y: e.top + grab.y + dy };
      return cardTargetAt(rows, centerOf(pointer, grab), pointer, any)?.beforeId;
    };

    expect(at(0, -(H + GAP))).toBe('b');
    expect(at(W + GAP, -(H + GAP))).toBe('c');
    // Over the gap between « d » and the slot, a little nearer « d ».
    expect(at(-(W + GAP) / 2 - 2, 0)).toBe('d');
    expect(at(-(W + GAP) / 2 + 2, 0)).toBeUndefined();
    // The free cell after the last one: last.
    expect(at(W + GAP, 0)).toBeUndefined();
  });

  it('puts the card last in a section when its center is on the header', () => {
    const page = [zone(PINS, [cell(0, 'p')]), zone(UNGROUPED, [cell(0, 'x'), cell(1, 'y')], 500)];

    expect(cardTargetAt(page, { x: 600, y: 516 }, { x: 900, y: 300 }, any)).toEqual({
      to: UNGROUPED,
      header: true,
    });
  });

  it('lets the pointer choose the section only when the center of the card is in none', () => {
    const page = [zone(PINS, [cell(0, 'p')]), zone(UNGROUPED, [cell(0, 'x'), cell(1, 'y')], 500)];

    // The center is under the pins, in no section: the pointer is in « No group ».
    expect(cardTargetAt(page, { x: 200, y: 480 }, { x: 200, y: 700 }, any)).toEqual({
      to: UNGROUPED,
      beforeId: 'x',
      header: false,
    });
    // The center is in the pins: the pointer in « No group » does not count.
    expect(cardTargetAt(page, { x: 200, y: 200 }, { x: 200, y: 700 }, any)?.to).toBe(PINS);
    expect(cardTargetAt(page, { x: 200, y: 2000 }, { x: 200, y: 2000 }, any)).toBeNull();
  });

  it('skips a section that takes no drop of the card', () => {
    const page = [zone(PINS, [cell(0, 'p')]), zone('g-1', [cell(0, 'x')], 500)];
    const onlyPins = (key: string) => key === PINS;

    expect(cardTargetAt(page, { x: 200, y: 700 }, { x: 200, y: 700 }, onlyPins)).toBeNull();
  });

  it('puts the card last in an empty section', () => {
    const empty: SectionZone = {
      key: 'g-2',
      header: { left: 0, top: 0, width: 1232, height: 32 },
      body: { left: 0, top: 32, width: 1232, height: 80 },
      cells: [],
    };

    expect(cardTargetAt([empty], { x: 600, y: 70 }, { x: 600, y: 70 }, any)).toEqual({
      to: 'g-2',
      beforeId: undefined,
      header: false,
    });
  });
});

describe('the sections', () => {
  it('reads a group, the projects with no group, and no section for the pins', () => {
    expect(searchSectionOf('g-1')).toEqual({ kind: 'group', groupId: 'g-1' });
    expect(searchSectionOf(UNGROUPED)).toEqual({ kind: 'ungrouped' });
    expect(searchSectionOf(PINS)).toBeUndefined();
  });

  it('shows the failures first, then the jobs that run, else no health', () => {
    const counts = { total: 4, failed: 1, running: 2, pipelines: 6 };

    expect(sectionHealth(counts)).toEqual({ kind: 'failed', count: 1 });
    expect(sectionHealth({ ...counts, failed: 0 })).toEqual({ kind: 'running', count: 2 });
    expect(sectionHealth({ ...counts, failed: 0, running: 0 })).toBeUndefined();
  });
});
