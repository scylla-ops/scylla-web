import { describe, it, expect } from 'vitest';
import { i18n } from '@lingui/core';
import type { CronModel } from '@base/features/triggers/presentation/mappers/cron.mapper.ts';
import { describeCron } from '../cron.presenter.ts';

const base: Omit<CronModel, 'frequency'> = {
  minute: 0,
  hour: 9,
  weekdays: [1, 2, 3, 4, 5],
  dayOfMonth: 1,
  custom: '',
};

describe('describeCron', () => {
  it('describes an hourly schedule', () => {
    expect(describeCron({ ...base, frequency: 'hourly', minute: 5 }, i18n)).toBe(
      'Every hour at :05',
    );
  });

  it('describes a daily schedule with zero-padded time', () => {
    expect(describeCron({ ...base, frequency: 'daily', minute: 5, hour: 9 }, i18n)).toBe(
      'Every day at 09:05',
    );
  });

  it('describes a weekly schedule by weekday labels, Mon-first order', () => {
    expect(
      describeCron({ ...base, frequency: 'weekly', minute: 0, hour: 9, weekdays: [0, 1] }, i18n),
    ).toBe('Mon, Sun at 09:00');
  });

  it('flags an empty weekly selection as needing at least one day', () => {
    expect(describeCron({ ...base, frequency: 'weekly', weekdays: [] }, i18n)).toBe(
      'Pick at least one day',
    );
  });

  it('describes a monthly schedule', () => {
    expect(
      describeCron({ ...base, frequency: 'monthly', minute: 0, hour: 3, dayOfMonth: 15 }, i18n),
    ).toBe('Day 15 of each month at 03:00');
  });

  it('describes a filled-in custom schedule generically', () => {
    expect(describeCron({ ...base, frequency: 'custom', custom: '*/5 * * * *' }, i18n)).toBe(
      'Custom schedule',
    );
  });

  it('describes an empty custom schedule as incomplete', () => {
    expect(describeCron({ ...base, frequency: 'custom', custom: '' }, i18n)).toBe(
      'Incomplete schedule',
    );
  });
});
