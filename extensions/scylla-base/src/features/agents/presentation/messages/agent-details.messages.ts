import { msg, plural } from '@lingui/core/macro';

export const agentDetailsMessages = {
  loadError: msg`Error loading agent`,
  notFound: msg`Agent not found`,

  disabledOn: (date: string) => msg`Disabled ${date}`,
  disabledTitle: msg`This agent is disabled`,
  disabledBody: (date: string) =>
    msg`It cannot sign in, and the server closed its connection on ${date}. Enable it to make its secrets and tokens work again.`,

  keyNumbers: msg`Key numbers`,
  jobs30Days: msg`Jobs, 30 days`,
  lastRunAgo: (relative: string) => msg`Last run ${relative}`,
  noRunYet: msg`No run yet`,
  successRate: msg`Success rate`,
  completedOf: (completed: number, total: number) => msg`${completed} of ${total} completed`,
  nothingFinished: msg`Nothing finished yet`,
  medianDuration: msg`Median duration`,
  startedToFinished: msg`Started to finished`,
  p95Duration: msg`p95 duration`,
  endSooner: msg`95% end sooner`,

  jobsPerDay: msg`Jobs per day`,
  last30ByCreationDay: msg`Last 30 days, by creation day`,
  completed: msg`Completed`,
  failed: msg`Failed`,
  cancelled: msg`Cancelled`,
  orphaned: msg`Orphaned`,
  dayDetail: (
    day: string,
    completed: number,
    failed: number,
    cancelled: number,
    orphaned: number,
  ) =>
    msg`${day}: ${completed} completed, ${failed} failed, ${cancelled} cancelled, ${orphaned} orphaned`,
  chartLabel: msg`Jobs per day over the last 30 days`,
  noJobInWindow: msg`No job in the last 30 days.`,
  allTime: msg`All time`,
  allTimeJobs: (count: number) => msg`${plural(count, { one: 'job', other: 'jobs' })}`,
  allTimeCompleted: (count: number) =>
    msg`${plural(count, { one: 'completed', other: 'completed' })}`,
  allTimeFailed: (count: number) => msg`${plural(count, { one: 'failed', other: 'failed' })}`,
  allTimeCancelled: (count: number) =>
    msg`${plural(count, { one: 'cancelled', other: 'cancelled' })}`,
  allTimeOrphaned: (count: number) => msg`${plural(count, { one: 'orphaned', other: 'orphaned' })}`,
  allTimeRunning: msg`running`,
  allTimePending: msg`pending`,

  recentJobs: msg`Recent jobs`,
  lastJobsOfAgent: msg`The last jobs this agent ran`,
  noJobYet: msg`No job yet`,
  jobRow: (pipeline: string, status: string, time: string) => msg`${pipeline}, ${status}, ${time}`,
  jobRowInProject: (project: string, pipeline: string, status: string, time: string) =>
    msg`${project} / ${pipeline}, ${status}, ${time}`,

  host: msg`Host`,
  fromLastHello: (relative: string) => msg`From the last hello, ${relative}`,
  hostAfterHello: msg`The agent sends these details when it connects.`,
  hostname: msg`Hostname`,
  system: msg`System`,
  agentVersion: msg`Agent version`,
  cpus: msg`CPUs`,
  memory: msg`Memory`,
  unknown: msg`Unknown`,

  secrets: msg`Secrets`,
  signsInWithOne: msg`The agent signs in with one of them`,
  secretEnabled: msg`Enabled`,
  secretActions: (label: string) => msg`Actions of the secret ${label}`,
  revoke: msg`Revoke`,
  revokeTitle: (label: string) => msg`Revoke “${label}”?`,
  revokeBody: msg`The agent cannot sign in with this secret any more, and its open connection closes. You cannot undo this.`,
  noSecret: msg`No secret: the agent cannot sign in. Reset the secret to make one.`,
  resetFootnote: msg`Reset makes a new secret and can revoke the others.`,

  runThisAgent: msg`Run this agent`,
  runThisAgentBody: msg`It never connected. Run it on a machine: replace <APP_SECRET> with its secret, or reset the secret to get a new one.`,

  deleteThisAgent: msg`Delete this agent`,
  deleteConsequence: msg`Its secrets, tokens and grants go. The jobs it ran stay.`,
};
