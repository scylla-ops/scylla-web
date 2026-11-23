import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
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

/** `t` reads the locale rune: the summary in a template follows a switch of the language. */
export const describeCron = (model: CronModel): string => {
  const time = `${pad2(model.hour)}:${pad2(model.minute)}`;
  switch (model.frequency) {
    case 'hourly':
      return t(msg`Every hour at :${pad2(model.minute)}`);
    case 'daily':
      return t(msg`Every day at ${time}`);
    case 'weekly': {
      if (model.weekdays.length === 0) return t(msg`Pick at least one day`);
      const days = WEEKDAYS.filter(d => model.weekdays.includes(d.value))
        .map(d => t(d.label))
        .join(', ');
      return t(msg`${days} at ${time}`);
    }
    case 'monthly':
      return t(msg`Day ${model.dayOfMonth} of each month at ${time}`);
    case 'custom':
      return model.custom.trim() ? t(msg`Custom schedule`) : t(msg`Incomplete schedule`);
  }
};
