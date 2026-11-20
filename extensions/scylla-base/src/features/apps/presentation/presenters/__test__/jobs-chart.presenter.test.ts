// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { jobsChart, niceMax } from '../jobs-chart.presenter.ts';

const ends = (completed: number, failed = 0) => ({ completed, failed, cancelled: 0, orphaned: 0 });
const at = (day: string, completed: number, failed = 0) => ({
  day: `${day}T00:00:00.000Z`,
  outcomes: ends(completed, failed),
});

const LAST_30 = { from: '2026-10-11', to: '2026-11-09' };

describe('niceMax', () => {
  it('rounds the peak up to a round top, and gives 10 with no job', () => {
    expect([0, 1, 5, 9, 16, 21, 45, 51, 79, 120].map(niceMax)).toEqual([
      10, 2, 6, 10, 20, 30, 50, 60, 80, 200,
    ]);
  });
});

describe('jobsChart', () => {
  it('gives one bar for each day, also the days with no job', () => {
    const chart = jobsChart({
      period: LAST_30,
      days: [at('2026-11-09', 9, 1)],
      joined: '2026-07-14',
      disabled: null,
    });

    expect(chart.unit).toBe('day');
    expect(chart.bars).toHaveLength(30);
    expect(chart.bars[29]).toEqual({
      from: '2026-11-09',
      to: '2026-11-09',
      outcomes: ends(9, 1),
      total: 10,
    });
    expect(chart.bars.filter(bar => bar.total === 0)).toHaveLength(29);
    expect(chart.max).toBe(10);
  });

  it('labels the first day, one day each week and the last day', () => {
    const chart = jobsChart({ period: LAST_30, days: [], joined: '2026-07-14', disabled: null });
    const short = jobsChart({
      period: { from: '2026-09-09', to: '2026-09-29' },
      days: [],
      joined: '2026-07-14',
      disabled: null,
    });

    expect(chart.labels.map(index => chart.bars[index].from)).toEqual([
      '2026-10-11',
      '2026-10-18',
      '2026-10-25',
      '2026-11-01',
      '2026-11-09',
    ]);
    expect(short.labels).toEqual([0, 7, 14, 20]);
  });

  it('keeps a bar for each day up to 90 days, then gives one bar for each week', () => {
    const daily = jobsChart({
      period: { from: '2026-08-12', to: '2026-11-09' },
      days: [],
      joined: '2026-07-14',
      disabled: null,
    });
    const weekly = jobsChart({
      period: { from: '2026-07-15', to: '2026-11-09' },
      days: [at('2026-07-15', 2), at('2026-07-16', 1), at('2026-11-03', 4), at('2026-11-09', 8)],
      joined: '2026-07-14',
      disabled: null,
    });

    expect(daily.unit).toBe('day');
    expect(daily.bars).toHaveLength(90);
    expect(weekly.unit).toBe('week');
    expect(weekly.bars).toHaveLength(17);
    expect(weekly.bars[0]).toMatchObject({ from: '2026-07-15', to: '2026-07-20', total: 3 });
    expect(weekly.bars[16]).toMatchObject({ from: '2026-11-03', to: '2026-11-09', total: 12 });
  });

  it('hatches the days before the creation of the agent', () => {
    const chart = jobsChart({ period: LAST_30, days: [], joined: '2026-11-07', disabled: null });

    expect(chart.notJoined).toEqual({ start: 0, end: 27 });
    expect(chart.disabled).toBeNull();
  });

  it('hatches the days after the agent was disabled', () => {
    const chart = jobsChart({
      period: LAST_30,
      days: [],
      joined: '2026-07-14',
      disabled: '2026-11-01',
    });

    expect(chart.notJoined).toBeNull();
    expect(chart.disabled).toEqual({ start: 22, end: 30 });
  });
});
