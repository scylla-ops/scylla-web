import { msg, plural } from '@lingui/core/macro';

/** The strings that both pages and the shared components show. */
export const agentsMessages = {
  agents: msg`Agents`,

  stateOnlineIdle: msg`Online, idle`,
  stateIdle: msg`Idle`,
  stateRunning: (count: number) =>
    msg`${plural(count, { one: 'Running # job', other: 'Running # jobs' })}`,
  stateOffline: msg`Offline`,
  stateNever: msg`Never connected`,
  stateDisabled: msg`Disabled`,

  connected: msg`Connected`,
  lastSeenAgo: (relative: string) => msg`Last seen ${relative}`,
  createdOn: (date: string) => msg`Created ${date}`,
  notReportedYet: msg`Not reported yet`,
  cpuCount: (count: number) => msg`${count} CPU`,
  memoryGb: (amount: number) => msg`${amount} GB`,
  memoryMb: (amount: number) => msg`${amount} MB`,

  close: msg`Close`,
  shownOneTime: msg`Shown one time`,
  noSecondChance: msg`You will not see this secret again.`,
  agentActions: msg`Agent actions`,
  open: msg`Open`,
  copyId: msg`Copy ID`,
  resetSecret: msg`Reset secret`,
  disable: msg`Disable`,
  enable: msg`Enable`,
  delete: msg`Delete`,
  deleteAgent: msg`Delete agent`,
  deleteAgentTitle: (name: string) => msg`Delete ${name}?`,
  deleteAgentBody: msg`Its secrets, tokens and grants go. The jobs it ran stay. You cannot undo this.`,
  copyAgentId: msg`Copy agent id`,

  jobsQueuedCheckAgents: msg`Jobs are queued: check that your agents are connected.`,
  noAgentConnected: msg`No agent connected: queued jobs are waiting for one.`,
  setUpAnAgent: msg`Set up an agent`,
};
