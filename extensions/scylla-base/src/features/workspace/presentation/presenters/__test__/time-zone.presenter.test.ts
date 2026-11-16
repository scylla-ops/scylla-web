// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { browserTimeZones, timeZoneOptions } from '../time-zone.presenter.ts';

const values = (names: readonly string[], current: string, browser: string) =>
  timeZoneOptions(names, current, browser, 'This browser').map(option => option.value);

describe('timeZoneOptions', () => {
  it('puts the zone of the browser first, with its hint, then the others in order', () => {
    const options = timeZoneOptions(
      ['Europe/Paris', 'America/New_York', 'UTC'],
      'UTC',
      'Europe/Paris',
      'This browser',
    );

    expect(options[0]).toEqual({
      value: 'Europe/Paris',
      label: 'Europe/Paris',
      hint: 'This browser',
    });
    expect(options.slice(1).map(option => option.value)).toEqual(['America/New_York', 'UTC']);
    expect(options[1]?.hint).toBeUndefined();
  });

  it('keeps a current zone and UTC that the browser does not list, one time each', () => {
    expect(values(['Europe/Paris'], 'US/Eastern', 'Europe/Paris')).toEqual([
      'Europe/Paris',
      'US/Eastern',
      'UTC',
    ]);
    expect(values(['UTC', 'Asia/Tokyo'], 'Asia/Tokyo', 'Asia/Tokyo')).toEqual([
      'Asia/Tokyo',
      'UTC',
    ]);
  });
});

describe('browserTimeZones', () => {
  it('gives the IANA names of the runtime', () => {
    expect(browserTimeZones()).toContain('Europe/Paris');
  });
});
