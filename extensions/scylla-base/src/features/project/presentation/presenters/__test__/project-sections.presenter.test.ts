// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { MAX_PINS } from '@base/features/project/domain/structs/project-layout.struct.ts';
import {
  applyMoves,
  dropBefore,
  movesToSave,
  neighborsOf,
  PINS,
  searchSectionOf,
  sectionHealth,
  UNGROUPED,
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

  it('drops before the card on its first half, and before the next card on its second half', () => {
    expect(dropBefore(['a', 'b', 'c'], 'b', false)).toBe('b');
    expect(dropBefore(['a', 'b', 'c'], 'b', true)).toBe('c');
    expect(dropBefore(['a', 'b', 'c'], 'c', true)).toBeUndefined();
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
