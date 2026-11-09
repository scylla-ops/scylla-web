// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  addDays,
  clampPeriod,
  dayOf,
  periodBounds,
  periodDays,
  presetPeriod,
  recentPeriod,
  shiftPeriod,
  withEnd,
  withStart,
} from '../stats-period.struct.ts';

const NOW = new Date('2026-11-09T10:00:00Z');
const BOUNDS = { from: '2026-07-14', to: '2026-11-09' };

describe('stats period', () => {
  it('takes the UTC day of a time', () => {
    expect(dayOf('2026-11-08T23:30:00-02:00')).toBe('2026-11-09');
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('counts both days of a period', () => {
    expect(periodDays({ from: '2026-11-09', to: '2026-11-09' })).toBe(1);
    expect(periodDays({ from: '2026-09-09', to: '2026-09-29' })).toBe(21);
  });

  it('starts the bounds at the creation of the agent and ends them today', () => {
    expect(periodBounds('2026-07-14T15:00:00Z', NOW)).toEqual(BOUNDS);
  });

  it('keeps at most a year of days in the bounds, as the server does', () => {
    const bounds = periodBounds('2020-01-01T00:00:00Z', NOW);

    expect(bounds).toEqual({ from: '2025-11-09', to: '2026-11-09' });
    expect(periodDays(bounds)).toBe(366);
  });

  it('gives the last 30 days, also before the creation of the agent', () => {
    expect(recentPeriod(NOW)).toEqual({ from: '2026-10-11', to: '2026-11-09' });
  });

  it('ends each preset today, and gives all the bounds for all', () => {
    expect(presetPeriod('7d', BOUNDS)).toEqual({ from: '2026-11-03', to: '2026-11-09' });
    expect(presetPeriod('30d', BOUNDS)).toEqual({ from: '2026-10-11', to: '2026-11-09' });
    expect(presetPeriod('90d', BOUNDS)).toEqual({ from: '2026-08-12', to: '2026-11-09' });
    expect(presetPeriod('all', BOUNDS)).toEqual(BOUNDS);
  });

  it('starts a preset longer than the life of the agent at its creation', () => {
    const young = { from: '2026-10-20', to: '2026-11-09' };

    expect(presetPeriod('30d', young)).toEqual(young);
  });

  it('puts a period in the bounds, and turns a period that ends before it starts', () => {
    expect(clampPeriod({ from: '2026-01-01', to: '2027-01-01' }, BOUNDS)).toEqual(BOUNDS);
    expect(clampPeriod({ from: '2026-10-20', to: '2026-10-10' }, BOUNDS)).toEqual({
      from: '2026-10-10',
      to: '2026-10-20',
    });
  });

  it('moves a period with the same length, and stops it at the bounds', () => {
    const period = { from: '2026-10-11', to: '2026-11-09' };

    expect(shiftPeriod(period, -32, BOUNDS)).toEqual({ from: '2026-09-09', to: '2026-10-08' });
    expect(shiftPeriod(period, 5, BOUNDS)).toEqual(period);
    expect(shiftPeriod(period, -500, BOUNDS)).toEqual({ from: '2026-07-14', to: '2026-08-12' });
  });

  it('moves one edge, in the bounds and not past the other edge', () => {
    const period = { from: '2026-09-09', to: '2026-09-29' };

    expect(withStart(period, '2026-09-01', BOUNDS)).toEqual({
      from: '2026-09-01',
      to: '2026-09-29',
    });
    expect(withStart(period, '2026-10-05', BOUNDS)).toEqual({
      from: '2026-09-29',
      to: '2026-09-29',
    });
    expect(withStart(period, '2026-01-01', BOUNDS).from).toBe('2026-07-14');
    expect(withEnd(period, '2026-12-01', BOUNDS)).toEqual({ from: '2026-09-09', to: '2026-11-09' });
    expect(withEnd(period, '2026-09-01', BOUNDS)).toEqual({ from: '2026-09-09', to: '2026-09-09' });
  });
});
