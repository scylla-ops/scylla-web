// @vitest-environment node
import { afterEach, describe, it, expect, vi } from 'vitest';
import { convertCronToLocal, convertCronToUTC } from '../cron-timezone.mapper.ts';

describe('convertCronToUTC / convertCronToLocal', () => {
  it('leaves a malformed (non-5-field) expression untouched', () => {
    expect(convertCronToUTC('not a cron')).toBe('not a cron');
    expect(convertCronToLocal('30 9 * *')).toBe('30 9 * *');
  });

  it('leaves an expression with a non-numeric minute or hour untouched (nothing to shift)', () => {
    expect(convertCronToUTC('*/15 * * * *')).toBe('*/15 * * * *');
    expect(convertCronToUTC('30 * * * *')).toBe('30 * * * *');
  });

  // The shift depends on the host's timezone: check the round trip, which holds everywhere.
  it.each(['30 9 * * *', '0 0 * * *', '15 23 * * *', '45 6 * * 1-5'])(
    'round-trips %s through UTC and back to local',
    expression => {
      expect(convertCronToLocal(convertCronToUTC(expression))).toBe(expression);
    },
  );

  it.each(['30 9 * * *', '0 0 * * *', '15 23 * * *'])(
    'round-trips %s through local and back to UTC',
    expression => {
      expect(convertCronToUTC(convertCronToLocal(expression))).toBe(expression);
    },
  );
});

describe('the day of reference', () => {
  const hostZone = process.env.TZ;

  afterEach(() => {
    vi.useRealTimers();
    if (hostZone === undefined) delete process.env.TZ;
    else process.env.TZ = hostZone;
  });

  it('is the same local day in both directions, also when the UTC day has a different offset', () => {
    // 00:23 in Paris on 26 October: still 25 October in UTC, the last day of summer time.
    process.env.TZ = 'Europe/Paris';
    vi.useFakeTimers({ now: new Date('2026-10-25T23:23:00Z') });

    expect(convertCronToLocal('0 0 * * *')).toBe('0 1 * * *');
    expect(convertCronToUTC(convertCronToLocal('0 0 * * *'))).toBe('0 0 * * *');
  });
});
