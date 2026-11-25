// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  MAX_CUSTOM_DAYS,
  bucketPeriod,
  customPeriodFrom,
  customPeriodIssue,
  periodRange,
} from '../period.presenter.ts';
import { addDays } from '../zoned-day.presenter.ts';

const PARIS = 'Europe/Paris';
const NOW = new Date('2026-11-17T09:30:00Z');

describe('periodRange', () => {
  it('gives the last 24 hours until now, by hour', () => {
    expect(periodRange({ kind: '24h' }, NOW, PARIS)).toEqual({
      from: new Date('2026-11-16T09:30:00Z'),
      to: null,
      bucket: 'hour',
    });
  });

  it.each([
    ['7d', '2026-11-10T23:00:00.000Z'],
    ['14d', '2026-11-03T23:00:00.000Z'],
    ['30d', '2026-10-18T22:00:00.000Z'],
  ] as const)('starts %s at midnight of the zone, today included', (kind, from) => {
    const range = periodRange({ kind }, NOW, PARIS);

    expect(range.from.toISOString()).toBe(from);
    expect(range.to).toBeNull();
    expect(range.bucket).toBe('day');
  });

  it('counts the days in the zone of the workspace, not in UTC', () => {
    const lateEvening = new Date('2026-11-16T23:30:00Z');

    expect(periodRange({ kind: '7d' }, lateEvening, PARIS).from.toISOString()).toBe(
      '2026-11-10T23:00:00.000Z',
    );
    expect(periodRange({ kind: '7d' }, lateEvening, 'UTC').from.toISOString()).toBe(
      '2026-11-10T00:00:00.000Z',
    );
  });

  it('ends a custom period at the end of its last day', () => {
    expect(
      periodRange({ kind: 'custom', from: '2026-11-02', to: '2026-11-08' }, NOW, PARIS),
    ).toEqual({
      from: new Date('2026-11-01T23:00:00Z'),
      to: new Date('2026-11-08T23:00:00Z'),
      bucket: 'day',
    });
  });

  it('ends a custom period that holds today at now', () => {
    expect(
      periodRange({ kind: 'custom', from: '2026-11-10', to: '2026-11-17' }, NOW, PARIS).to,
    ).toBeNull();
  });

  it('gives hours to a custom day and weeks to a long custom period', () => {
    expect(
      periodRange({ kind: 'custom', from: '2026-11-12', to: '2026-11-12' }, NOW, PARIS).bucket,
    ).toBe('hour');
    expect(
      periodRange({ kind: 'custom', from: '2026-06-01', to: '2026-11-01' }, NOW, PARIS).bucket,
    ).toBe('week');
  });
});

describe('customPeriodFrom', () => {
  it('keeps the days of a preset', () => {
    expect(customPeriodFrom({ kind: '14d' }, '2026-11-17')).toEqual({
      kind: 'custom',
      from: '2026-11-04',
      to: '2026-11-17',
    });
    expect(customPeriodFrom({ kind: '24h' }, '2026-11-17')).toEqual({
      kind: 'custom',
      from: '2026-11-17',
      to: '2026-11-17',
    });
  });

  it('keeps a custom period as it is', () => {
    const period = { kind: 'custom', from: '2026-10-01', to: '2026-10-31' } as const;

    expect(customPeriodFrom(period, '2026-11-17')).toBe(period);
  });
});

describe('customPeriodIssue', () => {
  const today = '2026-11-17';

  it('accepts a period of past days that ends today at the latest', () => {
    expect(customPeriodIssue('2026-11-01', '2026-11-17', today)).toBeNull();
    expect(customPeriodIssue('2026-11-17', '2026-11-17', today)).toBeNull();
  });

  it('refuses an empty day, a start after the end and an end in the future', () => {
    expect(customPeriodIssue('', '2026-11-17', today)).toBe('incomplete');
    expect(customPeriodIssue('2026-11-10', '2026-11-09', today)).toBe('start-after-end');
    expect(customPeriodIssue('2026-11-10', '2026-11-18', today)).toBe('end-in-future');
  });

  it('refuses a period longer than one year', () => {
    const from = addDays(today, -MAX_CUSTOM_DAYS);

    expect(customPeriodIssue(from, today, today)).toBe('too-long');
    expect(customPeriodIssue(addDays(from, 1), today, today)).toBeNull();
  });
});

describe('bucketPeriod', () => {
  it('gives the day of a bar of one day, in the zone of the workspace', () => {
    expect(bucketPeriod('2026-11-11T23:00:00Z', 'day', PARIS, '2026-11-17')).toEqual({
      kind: 'custom',
      from: '2026-11-12',
      to: '2026-11-12',
    });
  });

  it('gives the seven days of a bar of one week, and stops at today', () => {
    expect(bucketPeriod('2026-11-01T23:00:00Z', 'week', PARIS, '2026-11-17')).toEqual({
      kind: 'custom',
      from: '2026-11-02',
      to: '2026-11-08',
    });
    expect(bucketPeriod('2026-11-15T23:00:00Z', 'week', PARIS, '2026-11-17')).toEqual({
      kind: 'custom',
      from: '2026-11-16',
      to: '2026-11-17',
    });
  });

  it('gives no period for a bar of one hour or a bar after today', () => {
    expect(bucketPeriod('2026-11-17T08:00:00Z', 'hour', PARIS, '2026-11-17')).toBeNull();
    expect(bucketPeriod('2026-11-18T08:00:00Z', 'day', PARIS, '2026-11-17')).toBeNull();
  });
});
