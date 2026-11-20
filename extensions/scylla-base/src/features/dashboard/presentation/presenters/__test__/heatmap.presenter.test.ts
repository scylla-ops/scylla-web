// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobBucket, JobFigures } from '@base/features/jobs';
import {
  HEATMAP_MAX_DAYS,
  busiestCell,
  heatLevels,
  heatmapRange,
  pairHours,
  weekGrid,
  weekdayNames,
} from '../heatmap.presenter.ts';

const PARIS = 'Europe/Paris';
const NOW = new Date('2026-11-20T09:30:00Z');

const bucket = (start: string, created: number): JobBucket => ({
  start,
  figures: {
    created,
    outcomes: { completed: 0, failed: 0, cancelled: 0, orphaned: 0 },
    p50Duration: null,
    p95Duration: null,
    p50Queue: null,
    p95Queue: null,
    runTime: 0,
  } satisfies JobFigures,
});

describe('heatmapRange', () => {
  it('counts the hours of the days of the period', () => {
    expect(heatmapRange({ kind: '14d' }, NOW, PARIS)).toEqual({
      from: new Date('2026-11-06T23:00:00Z'),
      to: null,
      bucket: 'hour',
      days: 14,
    });
  });

  it('takes one week at least', () => {
    expect(heatmapRange({ kind: '24h' }, NOW, PARIS)).toMatchObject({
      from: new Date('2026-11-13T23:00:00Z'),
      to: null,
      days: 7,
    });
  });

  it('keeps the last 41 days of a longer period, under 1000 hours', () => {
    const range = heatmapRange({ kind: 'custom', from: '2026-01-01', to: '2026-06-30' }, NOW, PARIS);
    expect(range.days).toBe(HEATMAP_MAX_DAYS);
    expect(range.to).toEqual(new Date('2026-06-30T22:00:00Z'));
    expect(range.from).toEqual(new Date('2026-05-20T22:00:00Z'));
    expect((range.to!.getTime() - range.from.getTime()) / 3_600_000).toBeLessThanOrEqual(1000);
  });
});

describe('weekGrid', () => {
  it('adds the hours of each weekday in the zone, Monday first', () => {
    const grid = weekGrid(
      [
        bucket('2026-11-16T12:00:00Z', 3),
        bucket('2026-11-23T12:00:00Z', 2),
        bucket('2026-11-15T23:00:00Z', 1),
        bucket('2026-11-22T22:00:00Z', 5),
      ],
      PARIS,
      item => item.figures.created,
    );
    expect(grid).toHaveLength(7);
    expect(grid[0][13]).toBe(5);
    expect(grid[0][0]).toBe(1);
    expect(grid[6][23]).toBe(5);
    expect(grid.flat().reduce((sum, value) => sum + value, 0)).toBe(11);
  });

  it('counts a bucket of a summer hour in its own hour', () => {
    const grid = weekGrid([bucket('2026-07-01T06:00:00Z', 4)], PARIS, item => item.figures.created);
    expect(grid[2][8]).toBe(4);
  });
});

describe('the cells', () => {
  const grid = [[0, 1, 2, 8], [4, 8, 0, 0], [], [], [], [], []].map(row => [...row, ...Array(24 - row.length).fill(0)]);

  it('gives 4 levels against the busiest cell, and 0 for an empty one', () => {
    expect(heatLevels(grid)[0].slice(0, 4)).toEqual([0, 1, 1, 4]);
    expect(heatLevels(grid)[1].slice(0, 2)).toEqual([2, 4]);
    expect(heatLevels([[0, 0]])).toEqual([[0, 0]]);
  });

  it('puts two hours in one cell', () => {
    expect(pairHours(grid)[0].slice(0, 2)).toEqual([1, 10]);
    expect(pairHours(grid)[0]).toHaveLength(12);
  });

  it('finds the first busiest weekday and hour', () => {
    expect(busiestCell(grid)).toEqual({ weekday: 0, hour: 3, count: 8 });
    expect(busiestCell([[0, 0]])).toBeNull();
  });

  it('names the weekdays from Monday', () => {
    expect(weekdayNames('en', 'short')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayNames('en', 'narrow')[6]).toBe('S');
  });
});
