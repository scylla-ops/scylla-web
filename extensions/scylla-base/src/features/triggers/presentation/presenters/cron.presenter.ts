import { msg } from '@lingui/core/macro';
import type { I18n, MessageDescriptor } from '@lingui/core';
import { pad2, type CronModel } from '../mappers/cron.mapper.ts';

/** Mon→Sun; `value` is the cron day number. Descriptors: built at import time. */
export const WEEKDAYS: { value: number; label: MessageDescriptor }[] = [
  { value: 1, label: msg`Mon` },
  { value: 2, label: msg`Tue` },
  { value: 3, label: msg`Wed` },
  { value: 4, label: msg`Thu` },
  { value: 5, label: msg`Fri` },
  { value: 6, label: msg`Sat` },
  { value: 0, label: msg`Sun` },
];

/** Takes `i18n`: it runs outside the component tree. */
export const describeCron = (model: CronModel, i18n: I18n): string => {
  const time = `${pad2(model.hour)}:${pad2(model.minute)}`;
  switch (model.frequency) {
    case 'hourly':
      return i18n._(msg`Every hour at :${pad2(model.minute)}`);
    case 'daily':
      return i18n._(msg`Every day at ${time}`);
    case 'weekly': {
      if (model.weekdays.length === 0) return i18n._(msg`Pick at least one day`);
      const days = WEEKDAYS.filter(d => model.weekdays.includes(d.value))
        .map(d => i18n._(d.label))
        .join(', ');
      return i18n._(msg`${days} at ${time}`);
    }
    case 'monthly':
      return i18n._(msg`Day ${model.dayOfMonth} of each month at ${time}`);
    case 'custom':
      return model.custom.trim() ? i18n._(msg`Custom schedule`) : i18n._(msg`Incomplete schedule`);
  }
};
