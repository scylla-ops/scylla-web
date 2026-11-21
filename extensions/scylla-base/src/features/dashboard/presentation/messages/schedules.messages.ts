import { msg } from '@lingui/core/macro';

/** The texts of "Schedules". */
export const scheduleMessages = {
  title: msg({ context: 'schedules', message: 'Schedules' }),
  nextFire: msg({ context: 'schedules', message: 'Next fire' }),
  next24h: msg({ context: 'schedules', message: 'next 24 h' }),
  problems: (count: number) => msg({ context: 'schedules', message: `${count} problems` }),
  oneProblem: msg({ context: 'schedules', message: '1 problem' }),
  inTime: (time: string) => msg({ context: 'schedules', message: `in ${time}` }),
  now: msg({ context: 'schedules', message: 'now' }),
  lastFires: msg({ context: 'schedules', message: 'Last fires' }),
  since: (time: string) => msg({ context: 'schedules', message: `since ${time}` }),
  fired: msg({ context: 'schedules', message: 'fired' }),
  fireFailed: msg({ context: 'schedules', message: 'fire failed' }),
  timeMissed: msg({ context: 'schedules', message: 'time missed' }),
  fireNow: (name: string) => msg({ context: 'schedules', message: `Fire ${name} now` }),
  noSchedule: msg({ context: 'schedules', message: 'No cron trigger' }),
  noScheduleText: msg({ context: 'schedules', message: 'Add a cron trigger to a pipeline to see its next fires here.' }),
  catalogHint: msg({ context: 'schedules', message: 'the next fires and the failed ones' }),
};
