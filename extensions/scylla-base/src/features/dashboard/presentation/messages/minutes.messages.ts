import { msg } from '@lingui/core/macro';

/** The texts of "Run minutes". */
export const minutesMessages = {
  title: msg({ context: 'minutes', message: 'Run minutes' }),
  minutes: (count: string) => msg({ context: 'minutes', message: `${count} min` }),
  thisMonth: msg({ context: 'minutes', message: 'this month' }),
  daysLeft: (count: number) => msg({ context: 'minutes', message: `${count} days left` }),
  pace: (minutes: string, day: string) => msg({ context: 'minutes', message: `At this pace: about ${minutes} min by ${day}` }),
  paceShort: (minutes: string) => msg({ context: 'minutes', message: `At this pace: ~${minutes} min` }),
  byProject: msg({ context: 'minutes', message: 'By project' }),
  minutesColumn: msg({ context: 'minutes', message: 'minutes' }),
  nothing: msg({ context: 'minutes', message: 'No run this month' }),
};
