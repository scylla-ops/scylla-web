import { describe, it, expect } from 'vitest';
import { formatUtcDay } from '@shared/utils/date-utils.ts';
import type { JobBucket, JobFigures } from '@base/features/jobs';
import {
  bucketAxis,
  dayBars,
  durationBars,
  durationChange,
  durationText,
  outcomeBars,
  periodMeta,
  rateChange,
  rateText,
  shortJobId,
} from '../job-figures.presenter.ts';

const figures = (overrides: Partial<JobFigures> = {}): JobFigures => ({
  created: 0,
  outcomes: { completed: 0, failed: 0, cancelled: 0, orphaned: 0 },
  p50Duration: null,
  p95Duration: null,
  p50Queue: null,
  p95Queue: null,
  runTime: 0,
  ...overrides,
});

const bucket = (start: string, overrides: Partial<JobFigures> = {}): JobBucket => ({
  start,
  figures: figures(overrides),
});

describe('rateText', () => {
  it('rounds the rate to a whole percent', () => {
    expect(rateText(146 / 164)).toBe('89%');
  });

  it('gives an em dash when no job counts', () => {
    expect(rateText(null)).toBe('—');
  });
});

describe('rateChange', () => {
  it('gives the change in points, with its sign, rounded to one decimal', () => {
    expect(rateChange(3.44)).toEqual({ label: '+3.4 pts', direction: 'up', tone: 'good' });
    expect(rateChange(-2.06)).toEqual({ label: '−2.1 pts', direction: 'down', tone: 'bad' });
  });

  it('is flat when the change rounds to 0', () => {
    expect(rateChange(0.04)).toEqual({ label: '0.0 pts', direction: 'flat', tone: 'neutral' });
  });

  it('gives null when a period has no rate', () => {
    expect(rateChange(null)).toBeNull();
  });
});

describe('durationChange', () => {
  it('gives the change in percent, and a shorter time is good', () => {
    expect(durationChange(176, 200)).toEqual({ label: '−12%', direction: 'down', tone: 'good' });
    expect(durationChange(220, 200)).toEqual({ label: '+10%', direction: 'up', tone: 'bad' });
  });

  it('gives null without a previous median', () => {
    expect(durationChange(176, null)).toBeNull();
    expect(durationChange(null, 200)).toBeNull();
    expect(durationChange(10, 0)).toBeNull();
  });
});

describe('durationText', () => {
  it('rounds to whole seconds', () => {
    expect(durationText(190.4)).toBe('3m 10s');
  });

  it('gives an em dash with no duration', () => {
    expect(durationText(null)).toBe('—');
  });
});

describe('outcomeBars', () => {
  it('scales each bar to the bucket with the most counted jobs, without the cancelled jobs', () => {
    const bars = outcomeBars([
      bucket('a', { outcomes: { completed: 6, failed: 2, cancelled: 9, orphaned: 0 } }),
      bucket('b', { outcomes: { completed: 2, failed: 1, cancelled: 0, orphaned: 1 } }),
      bucket('c'),
    ]);

    expect(bars).toEqual([
      { start: 'a', completed: 75, failed: 25, orphaned: 0 },
      { start: 'b', completed: 25, failed: 12.5, orphaned: 12.5 },
      { start: 'c', completed: 0, failed: 0, orphaned: 0 },
    ]);
  });
});

describe('durationBars', () => {
  it('scales the medians and the p95 to the highest p95', () => {
    expect(
      durationBars([
        bucket('a', { p50Duration: 50, p95Duration: 200 }),
        bucket('b', { p50Duration: 100, p95Duration: 100 }),
        bucket('c'),
      ]),
    ).toEqual([
      { start: 'a', p50: 25, p95: 100 },
      { start: 'b', p50: 50, p95: 50 },
      { start: 'c', p50: 0, p95: 0 },
    ]);
  });

  it('draws nothing when no bucket has a duration', () => {
    expect(durationBars([bucket('a')])).toEqual([{ start: 'a', p50: 0, p95: 0 }]);
  });
});

describe('bucketAxis', () => {
  const days = ['2026-11-01T23:00:00Z', '2026-11-02T23:00:00Z', '2026-11-03T23:00:00Z'].map(
    start => ({ start }),
  );

  it('names the first day, the middle day and today, in the zone of the workspace', () => {
    expect(bucketAxis(days, 'day', 'Europe/Paris', true)).toEqual([
      formatUtcDay('2026-11-02'),
      formatUtcDay('2026-11-03'),
      'today',
    ]);
  });

  it('names the last day when the period ended before today', () => {
    expect(bucketAxis(days, 'day', 'Europe/Paris', false)).toEqual(
      ['2026-11-02', '2026-11-03', '2026-11-04'].map(day => formatUtcDay(day)),
    );
  });

  it('names the hours of a period by hour, and now at the end', () => {
    const hours = ['2026-11-17T08:00:00Z', '2026-11-17T09:00:00Z'].map(start => ({ start }));

    expect(bucketAxis(hours, 'hour', 'Europe/Paris', true)).toEqual(['09:00', '09:00', 'now']);
  });

  it('gives no axis for fewer than two buckets', () => {
    expect(bucketAxis(days.slice(0, 1), 'day', 'UTC', true)).toBeNull();
  });
});

describe('periodMeta', () => {
  it.each([
    [{ kind: '24h' } as const, '24 hours'],
    [{ kind: '7d' } as const, '7 days'],
    [{ kind: '30d' } as const, '30 days'],
    [
      { kind: 'custom', from: '2026-11-02', to: '2026-11-15' } as const,
      `${formatUtcDay('2026-11-02')} – ${formatUtcDay('2026-11-15')}`,
    ],
  ])('names %j', (period, text) => {
    expect(periodMeta(period)).toBe(text);
  });
});

describe('shortJobId', () => {
  it('keeps the last 8 characters', () => {
    expect(shortJobId('0193a1b2-c3d4-7e8f-9a0b-1c2d3fa2ee7c')).toBe('3fa2ee7c');
  });
});

describe('dayBars', () => {
  it('scales each bar to the highest, and marks a bucket with no run as empty, not as 0 %', () => {
    const bars = dayBars([
      bucket('a', { outcomes: { completed: 3, failed: 1, cancelled: 0, orphaned: 0 } }),
      bucket('b', { outcomes: { completed: 0, failed: 2, cancelled: 0, orphaned: 0 } }),
      bucket('c'),
    ]);

    expect(bars).toEqual([
      { start: 'a', empty: false, completed: 75, failed: 25, other: 0, top: 100 },
      { start: 'b', empty: false, completed: 0, failed: 50, other: 0, top: 50 },
      { start: 'c', empty: true, completed: 0, failed: 0, other: 0, top: 0 },
    ]);
  });
});
