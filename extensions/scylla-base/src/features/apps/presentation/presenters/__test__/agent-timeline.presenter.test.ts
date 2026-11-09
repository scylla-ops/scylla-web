// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { daysForPixels, spanOf, timelineStrip } from '../agent-timeline.presenter.ts';

const BOUNDS = { from: '2026-07-14', to: '2026-11-09' };

const at = (day: string, completed: number, failed = 0, orphaned = 0) => ({
  day: `${day}T00:00:00.000Z`,
  outcomes: { completed, failed, cancelled: 0, orphaned },
});

describe('timelineStrip', () => {
  it('gives each day from the creation of the agent to today, with its jobs', () => {
    const strip = timelineStrip({
      bounds: BOUNDS,
      days: [at('2026-07-14', 3), at('2026-09-22', 3, 2, 6)],
      disabled: null,
    });

    expect(strip.days).toHaveLength(119);
    expect(strip.days[0]).toMatchObject({ day: '2026-07-14', total: 3, incident: false });
    expect(strip.days[70]).toMatchObject({ day: '2026-09-22', total: 11, incident: true });
    expect(strip.days[118]).toMatchObject({ day: '2026-11-09', total: 0 });
    expect(strip.peak).toBe(11);
  });

  it('labels the first day, the start of each month and today', () => {
    const { marks } = timelineStrip({ bounds: BOUNDS, days: [], disabled: null });

    expect(marks.map(mark => [mark.day, mark.kind])).toEqual([
      ['2026-07-14', 'start'],
      ['2026-08-01', 'month'],
      ['2026-09-01', 'month'],
      ['2026-10-01', 'month'],
      ['2026-11-01', 'month'],
      ['2026-11-09', 'today'],
    ]);
    expect(marks[1].at).toBeCloseTo(18 / 119);
  });

  it('drops a month name that would overlap the first day', () => {
    const { marks } = timelineStrip({
      bounds: { from: '2026-10-29', to: '2026-11-09' },
      days: [],
      disabled: null,
    });

    expect(marks.map(mark => mark.kind)).toEqual(['start', 'month', 'today']);
    expect(
      timelineStrip({ bounds: { from: '2026-07-31', to: '2026-11-09' }, days: [], disabled: null })
        .marks[1].day,
    ).toBe('2026-09-01');
  });

  it('marks the days after the agent was disabled', () => {
    const strip = timelineStrip({ bounds: BOUNDS, days: [], disabled: '2026-10-02' });
    const today = timelineStrip({ bounds: BOUNDS, days: [], disabled: '2026-11-09' });

    expect(strip.disabled).toEqual({ left: 81 / 119, width: 38 / 119 });
    expect(today.disabled).toBeNull();
  });
});

describe('the window of the period', () => {
  it('covers the days of the period on the strip', () => {
    expect(spanOf({ from: '2026-10-11', to: '2026-11-09' }, BOUNDS)).toEqual({
      left: 89 / 119,
      width: 30 / 119,
    });
  });

  it('turns a move of the pointer into days', () => {
    expect(daysForPixels(100, 1190, BOUNDS)).toBe(10);
    expect(daysForPixels(-14, 1190, BOUNDS)).toBe(-1);
    expect(daysForPixels(50, 0, BOUNDS)).toBe(0);
  });
});
