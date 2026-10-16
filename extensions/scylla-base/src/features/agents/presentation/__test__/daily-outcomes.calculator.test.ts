// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { DailyOutcome } from '@base/features/agents/domain/structs/agent.struct.ts';
import { axisTop, bucketTotal, dateOfDay, fillDays } from '../daily-outcomes.calculator.ts';

const TODAY = new Date(2026, 9, 11, 12, 0);

const outcome = (day: string, overrides: Partial<DailyOutcome> = {}): DailyOutcome => ({
  day,
  completed: 0,
  failed: 0,
  cancelled: 0,
  orphaned: 0,
  medianDurationMs: null,
  ...overrides,
});

describe('fillDays', () => {
  it('returns the 30 days of the stats window, oldest first, ending today', () => {
    const days = fillDays([], undefined, TODAY);

    expect(days).toHaveLength(30);
    expect(days[29].day).toBe('2026-10-11');
    expect(days[0].day).toBe('2026-09-12');
  });

  it('zero-fills the days the backend left out', () => {
    const days = fillDays([outcome('2026-10-11T08:00:00', { completed: 3 })], 7, TODAY);

    expect(days.filter(day => bucketTotal(day) === 0)).toHaveLength(6);
    expect(days[6]).toMatchObject({ completed: 3 });
  });

  it('keeps the orphaned jobs of a day', () => {
    const days = fillDays([outcome('2026-10-11T08:00:00', { orphaned: 2 })], 7, TODAY);

    expect(bucketTotal(days[6])).toBe(2);
  });

  it('lands an outcome on its local calendar day, not its UTC one', () => {
    const days = fillDays([outcome('2026-10-11T23:30:00', { failed: 2 })], 7, TODAY);

    expect(days[6]).toMatchObject({ day: '2026-10-11', failed: 2 });
  });
});

describe('axisTop', () => {
  it('is an even number above the tallest day, so the middle line is a whole count', () => {
    const days = fillDays(
      [outcome('2026-10-11T08:00:00', { completed: 3, cancelled: 1 })],
      7,
      TODAY,
    );

    expect(axisTop(days)).toBe(6);
  });

  it('still lays out an empty window', () => {
    expect(axisTop(fillDays([], 7, TODAY))).toBe(2);
  });
});

describe('dateOfDay', () => {
  it('reads a day key as a local date', () => {
    const date = dateOfDay('2026-09-12');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 12]);
  });
});
