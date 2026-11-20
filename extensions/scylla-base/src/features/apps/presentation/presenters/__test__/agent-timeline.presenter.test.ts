// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  daysForPixels,
  labelShift,
  spanOf,
  stripColumns,
  timelineStrip,
  windowBox,
} from '../agent-timeline.presenter.ts';

const BOUNDS = { from: '2026-07-14', to: '2026-11-09' };
const TODAY = { from: '2026-11-09', to: '2026-11-09' };

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
      width: 0,
    });

    expect(strip.days).toHaveLength(119);
    expect(strip.columns).toBe(119);
    expect(strip.days[0]).toMatchObject({ day: '2026-07-14', total: 3, incident: false });
    expect(strip.days[70]).toMatchObject({ day: '2026-09-22', total: 11, incident: true });
    expect(strip.days[118]).toMatchObject({ day: '2026-11-09', total: 0 });
    expect(strip.peak).toBe(11);
  });

  it('labels the first day and the start of each month', () => {
    const strip = timelineStrip({ bounds: BOUNDS, days: [], disabled: null, width: 1080 });

    expect(strip.start).toBe('2026-07-14');
    expect(strip.months.map(mark => mark.day)).toEqual([
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ]);
    expect(strip.months[0].at).toBeCloseTo(19 / 120);
  });

  it('drops a month name that would overlap the first day or today', () => {
    const months = (from: string, width: number) =>
      timelineStrip({
        bounds: { from, to: '2026-11-09' },
        days: [],
        disabled: null,
        width,
      }).months.map(mark => mark.day);

    expect(months('2026-07-31', 1080)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect(months('2026-10-29', 1080)).toEqual([]);
    expect(months('2026-10-29', 0)).toEqual([]);
    expect(months('2026-07-14', 400)).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('marks the days after the agent was disabled', () => {
    const strip = timelineStrip({ bounds: BOUNDS, days: [], disabled: '2026-10-02', width: 0 });
    const today = timelineStrip({ bounds: BOUNDS, days: [], disabled: '2026-11-09', width: 0 });

    expect(strip.disabled).toEqual({ left: 81 / 119, width: 38 / 119 });
    expect(today.disabled).toBeNull();
  });
});

describe('a strip with few days', () => {
  it('keeps the bars of the design, and puts the days at the end', () => {
    const strip = timelineStrip({
      bounds: { from: '2026-11-07', to: '2026-11-09' },
      days: [at('2026-11-08', 44)],
      disabled: '2026-11-08',
      width: 1080,
    });

    expect(strip.columns).toBe(120);
    expect(strip.days.map(day => day.total)).toEqual([0, 44, 0]);
    expect(strip.disabled).toEqual({ left: 119 / 120, width: 1 / 120 });
    expect(stripColumns(BOUNDS, 400)).toBe(119);
  });

  it('labels only today on the first day of the agent', () => {
    const strip = timelineStrip({
      bounds: TODAY,
      days: [at('2026-11-09', 12)],
      disabled: null,
      width: 1080,
    });

    expect(strip.start).toBeNull();
    expect(strip.months).toEqual([]);
    expect(strip.days).toHaveLength(1);
  });
});

describe('the window of the period', () => {
  it('covers the days of the period on the strip', () => {
    expect(spanOf({ from: '2026-10-11', to: '2026-11-09' }, BOUNDS, 119)).toEqual({
      left: 89 / 119,
      width: 30 / 119,
    });
    expect(spanOf({ from: '2026-10-11', to: '2026-11-09' }, BOUNDS, 120)).toEqual({
      left: 90 / 120,
      width: 30 / 120,
    });
  });

  it('turns a move of the pointer into days', () => {
    expect(daysForPixels(100, 1190, 119)).toBe(10);
    expect(daysForPixels(-14, 1190, 119)).toBe(-1);
    expect(daysForPixels(50, 0, 119)).toBe(0);
  });

  it('keeps room for its two handles on a strip of one day, in the strip', () => {
    const box = windowBox(spanOf(TODAY, TODAY, 120), 1080);

    expect(box.width * 1080).toBeCloseTo(28);
    expect(box.left + box.width).toBeCloseTo(1);
    expect(windowBox({ left: 0, width: 1 / 120 }, 1080).left).toBe(0);
    expect(windowBox({ left: 0.5, width: 1 / 120 }, 1080).left).toBeCloseTo(
      0.5 + (1 / 120 - 28 / 1080) / 2,
    );
  });

  it('keeps a window that is wide enough, and a strip that is not measured', () => {
    const span = { left: 0.75, width: 0.25 };

    expect(windowBox(span, 1080)).toBe(span);
    expect(windowBox({ left: 1, width: 0 }, 0)).toEqual({ left: 1, width: 0 });
  });

  it('keeps the label of a drag in the strip', () => {
    expect(labelShift({ left: 0.25, width: 0.5 }, 1024)).toBe(
      'clamp(-512px, -50%, calc(512px - 100%))',
    );
    expect(labelShift({ left: 0.96875, width: 0.03125 }, 1024)).toBe(
      'clamp(-1008px, -50%, calc(16px - 100%))',
    );
  });
});
