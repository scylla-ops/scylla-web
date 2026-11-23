import { msg, plural } from '@lingui/core/macro';

/** The texts of "Needs you". */
export const attentionMessages = {
  openNow: (count: number) =>
    msg({ context: 'attention', message: plural(count, { one: 'open now', other: 'open now' }) }),
  nothingOpen: msg({ context: 'attention', message: 'nothing open' }),
  open: (count: number) =>
    msg({ context: 'attention', message: plural(count, { one: 'open', other: 'open' }) }),
  newCount: (count: number) => msg({ context: 'attention', message: `${count} new` }),
  newMark: msg({ context: 'attention', message: 'new' }),
  newSince: (count: number, time: string) =>
    msg({ context: 'attention', message: `${count} new since your visit at ${time}` }),
  newSinceFirst: (count: number) => msg({ context: 'attention', message: `${count} new` }),
  more: (count: number) => msg({ context: 'attention', message: `+ ${count} more` }),
  seeAll: msg({ context: 'attention', message: 'See all' }),
  seeAllCount: (count: number) => msg({ context: 'attention', message: `See all ${count}` }),
  allClear: msg({ context: 'attention', message: 'All clear' }),
  allClearText: msg({
    context: 'attention',
    message:
      'Nothing needs you now. An item shows here when a job fails, a fire fails or a time is missed, and goes away when it is fixed.',
  }),
  failed: msg({ context: 'attention', message: 'failed' }),
  fireFailed: msg({ context: 'attention', message: 'fire failed' }),
  orphaned: msg({ context: 'attention', message: 'orphaned' }),
  timeMissed: msg({ context: 'attention', message: 'time missed' }),
  agentOffline: msg({ context: 'attention', message: 'agent offline' }),
  approval: msg({ context: 'attention', message: 'approval' }),
  minutes: (count: number) => msg({ context: 'ago', message: `${count} min` }),
  hours: (count: number) => msg({ context: 'ago', message: `${count} h` }),
  hoursMinutes: (hours: number, minutes: number) => msg({ context: 'ago', message: `${hours} h ${minutes}` }),
  days: (count: number) => msg({ context: 'ago', message: `${count} d` }),
  logs: msg({ context: 'attention', message: 'Logs' }),
  agent: msg({ context: 'attention', message: 'Agent' }),
};
