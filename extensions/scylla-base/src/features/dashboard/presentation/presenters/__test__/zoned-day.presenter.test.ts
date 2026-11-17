// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  addDays,
  clockIn,
  dayIn,
  daysBetween,
  knownTimeZone,
  startOfDayIn,
  utcOffsetLabel,
} from '../zoned-day.presenter.ts';

describe('dayIn', () => {
  it('gives the day of the zone, not the day of UTC', () => {
    const instant = new Date('2026-11-16T23:30:00Z');

    expect(dayIn(instant, 'Europe/Paris')).toBe('2026-11-17');
    expect(dayIn(instant, 'UTC')).toBe('2026-11-16');
    expect(dayIn(instant, 'America/New_York')).toBe('2026-11-16');
  });
});

describe('startOfDayIn', () => {
  it('starts the day at midnight of the zone', () => {
    expect(startOfDayIn('2026-11-17', 'Europe/Paris').toISOString()).toBe('2026-11-16T23:00:00.000Z');
    expect(startOfDayIn('2026-11-17', 'Asia/Kolkata').toISOString()).toBe('2026-11-16T18:30:00.000Z');
    expect(startOfDayIn('2026-11-17', 'UTC').toISOString()).toBe('2026-11-17T00:00:00.000Z');
  });

  it('follows the change to summer time', () => {
    expect(startOfDayIn('2026-03-29', 'Europe/Paris').toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(startOfDayIn('2026-03-30', 'Europe/Paris').toISOString()).toBe('2026-03-29T22:00:00.000Z');
  });

  it('starts the day at 01:00 when the clock skips midnight', () => {
    const start = startOfDayIn('2026-09-06', 'America/Santiago');

    expect(dayIn(start, 'America/Santiago')).toBe('2026-09-06');
    expect(dayIn(new Date(start.getTime() - 1000), 'America/Santiago')).toBe('2026-09-05');
  });
});

describe('addDays and daysBetween', () => {
  it('count calendar days across a month and a year', () => {
    expect(addDays('2026-11-17', -13)).toBe('2026-11-04');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-11-04', '2026-11-17')).toBe(14);
    expect(daysBetween('2026-11-17', '2026-11-17')).toBe(1);
  });
});

describe('utcOffsetLabel', () => {
  it('names the offset of the zone at the instant', () => {
    const november = new Date('2026-11-17T12:00:00Z');

    expect(utcOffsetLabel('Europe/Paris', november)).toBe('UTC+1');
    expect(utcOffsetLabel('Europe/Paris', new Date('2026-07-01T12:00:00Z'))).toBe('UTC+2');
    expect(utcOffsetLabel('Asia/Kolkata', november)).toBe('UTC+5:30');
    expect(utcOffsetLabel('America/New_York', november)).toBe('UTC-5');
    expect(utcOffsetLabel('UTC', november)).toBe('UTC');
  });
});

describe('knownTimeZone', () => {
  it('keeps a zone of the browser and falls back to UTC for an unknown one', () => {
    expect(knownTimeZone('Europe/Paris')).toBe('Europe/Paris');
    expect(knownTimeZone('Mars/Olympus')).toBe('UTC');
  });
});

describe('clockIn', () => {
  it('gives the time of the zone on 24 hours', () => {
    expect(clockIn(new Date('2026-11-17T08:05:00Z'), 'Europe/Paris')).toBe('09:05');
    expect(clockIn(new Date('2026-11-17T23:30:00Z'), 'Asia/Kolkata')).toBe('05:00');
  });

  it('gives 00:00 at midnight, not 24:00', () => {
    expect(clockIn(new Date('2026-11-16T23:00:00Z'), 'Europe/Paris')).toBe('00:00');
  });
});
