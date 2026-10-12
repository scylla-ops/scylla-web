import { msg, plural } from '@lingui/core/macro';

export const agentsPageMessages = {
  subtitle: msg`The machines that take and run the jobs of this organization.`,
  newAgent: msg`New agent`,
  createDenied: msg`You don't have permission to create agents.`,
  loadError: msg`Error loading agents`,

  noAgentYet: msg`No agent yet`,
  noAgentBody: msg`An agent takes the jobs of this organization and runs them. Create one to get its secret, then start it on a machine.`,
  createFirstAgent: msg`Create your first agent`,

  online: msg`Online`,
  onlineOf: (online: number, total: number) => msg`${online} of ${total}`,
  agentsRunning: (count: number) =>
    msg`${plural(count, {
      0: 'No agent is running a job',
      one: '# is running a job',
      other: '# are running a job',
    })}`,
  runningNow: msg`Running now`,
  jobCount: (count: number) => msg`${plural(count, { one: '# job', other: '# jobs' })}`,
  nothingRuns: msg`Every agent waits`,
  noAgentOnline: msg`No agent online`,
  needsAttention: msg`Needs attention`,
  attentionDetail: (offline: number, never: number) =>
    msg`${offline} offline, ${never} never connected`,
  finishedLast30Days: msg`Finished jobs, last 30 days`,
  partial: (count: number) =>
    msg`${plural(count, {
      one: 'Partial: # agent not counted',
      other: 'Partial: # agents not counted',
    })}`,
  succeeded: (percent: string) => msg`${percent} succeeded`,
  noJobYet: msg`No job yet`,
  statsHidden: msg`You cannot see the stats.`,

  filterByState: msg`Filter by state`,
  filterAll: msg`All`,
  searchPlaceholder: msg`Search by name or host`,
  noMatch: msg`No agent matches this filter.`,

  columnAgent: msg`Agent`,
  columnHost: msg`Host`,
  columnAccess: msg`Access`,
  columnJobs: msg`Jobs, 30 days`,
  columnActivity: msg`Activity`,
  columnActions: msg`Actions`,

  sentAtFirstConnection: msg`Sent at the first connection`,
  allProjects: msg`All projects`,
  allProjectsOf: (organization: string) => msg`All projects of ${organization}`,
  allOrganizations: msg`All organizations`,
  noGrant: msg`No grant`,
  moreGrants: (count: number) => msg`+${count}`,
  sparkline: (total: number) => msg`${total} jobs in the last 30 days`,

  disabledSince: (date: string) => msg`Since ${date}`,
  showRunCommand: msg`Show the run command`,
  waitingFirstConnection: msg`Waiting for its first connection`,
};
