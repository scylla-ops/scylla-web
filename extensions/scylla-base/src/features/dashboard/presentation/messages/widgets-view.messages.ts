import { msg } from '@lingui/core/macro';

/** The texts of the widgets of the view mode. */
export const viewMessages = {
  lastTwentyFourHours: msg`Last 24 hours`,
  jobsAndFailed: (jobs: number, failed: number) => msg`${jobs} jobs · ${failed} failed`,
  passed: msg`passed`,
  noJobInDay: msg`No job in the last 24 hours`,

  summary: msg`Summary`,
  oneThing: msg`1 thing`,
  things: (count: number) => msg`${count} things`,
  needsYouOne: msg`needs you.`,
  needYou: msg`need you.`,
  allClear: msg`All clear.`,
  restIsFine: (running: number, waiting: number, green: number, total: number) =>
    msg`The rest is fine: ${running} jobs run now, ${waiting} wait for an agent, and ${green} of ${total} pipelines are green.`,
  allIsFine: (running: number, waiting: number, green: number, total: number) =>
    msg`Nothing needs you: ${running} jobs run now, ${waiting} wait for an agent, and ${green} of ${total} pipelines are green.`,

  running: (count: number) => msg`${count} running`,
  waiting: (count: number) => msg`${count} waiting`,
  agentsOnline: (online: number, total: number) => msg`${online} of ${total} agents online`,
  agentsOf: (online: number, total: number) => msg`${online} of ${total} agents`,
  ofTotal: (part: number, total: number) => msg`${part} of ${total}`,
  longest: (duration: string) => msg`longest ${duration}`,
  offline: (name: string) => msg`${name} offline`,
  allOnline: msg`all online`,
  nothingRuns: msg`nothing runs`,
  nothingWaits: msg`nothing waits`,
  noAgent: msg`No agent`,

  agents: msg`Agents`,
  slotsBusy: (busy: number, total: number) => msg`${busy} of ${total} job slots busy`,
  agentsOnlineLower: msg`agents online`,

  pipelinesGreen: (green: number, total: number) => msg`${green} of ${total} green`,

  runsPerDay: msg`Runs per day`,
  runsPerHour: msg`Runs per hour`,
  runsPerWeek: msg`Runs per week`,
  runMinutes: msg`Run minutes`,
  p50RunDuration: msg`p50 run duration`,

  failedAt: (when: string) => msg`Failed · ${when}`,
  orphanedAt: (when: string) => msg`Orphaned · ${when}`,
  approvalSince: (when: string) => msg`Waits for an approval · ${when}`,
  jobOf: (id: string) => msg`Job ${id}`,
  approvalText: msg`A job from a fork waits for a review before it runs.`,
  perDay: (value: string) => msg`${value} per day`,
  perHour: (value: string) => msg`${value} per hour`,
  perWeek: (value: string) => msg`${value} per week`,
  vsPrevious: (change: string) => msg`${change} vs previous`,
  hoursAgo: (hours: number) => msg`${hours} h ago`,
  hours: (hours: number) => msg`${hours} h`,
  fireFailedAt: (when: string) => msg`Did not fire · ${when}`,
  timeMissedAt: (when: string) => msg`Time missed · ${when}`,
  agentOfflineAt: (when: string) => msg`Agent offline · ${when}`,
  fireOf: (trigger: string) => msg`The trigger ${trigger} made no job.`,
  agentAway: msg`The agent is not connected.`,
  openAndNew: (open: number, fresh: number) => msg`${open} open · ${fresh} new`,
  times: (count: number) => msg`${count} times`,
  newMark: msg({ context: 'attention', message: 'new' }),
  sinceLastVisit: msg`since your last visit`,
  allClearText: msg`No job, fire or agent needs you now.`,
  moreItems: (count: number) => msg`+ ${count} more`,
};
