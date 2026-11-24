import { appStateOf, type AppEntity } from '../entities/app.entity.ts';
import { endedJobs, type AgentStats } from './agent-stats.struct.ts';

/** The state of an agent in the list. `running`: online with a job now. */
export type AgentStatus = 'running' | 'online' | 'offline' | 'never' | 'disabled';

/** The filters of the list. A running agent is also online. */
export type AgentFilter = 'all' | 'online' | 'offline' | 'never' | 'disabled';

export const AGENT_FILTERS: readonly AgentFilter[] = [
  'all',
  'online',
  'offline',
  'never',
  'disabled',
];

type ListedAgent = Pick<
  AppEntity,
  'runner' | 'connected' | 'lastSeenAt' | 'runningJobs' | 'disabledAt'
>;

export const agentStatusOf = (agent: ListedAgent): AgentStatus => {
  if (agent.disabledAt) return 'disabled';
  const state = appStateOf(agent);
  if (state === 'online' && agent.runningJobs > 0) return 'running';
  return state;
};

const filterOfStatus = (status: AgentStatus): Exclude<AgentFilter, 'all'> =>
  status === 'running' ? 'online' : status;

export const matchesFilter = (agent: ListedAgent, filter: AgentFilter): boolean =>
  filter === 'all' || filterOfStatus(agentStatusOf(agent)) === filter;

export const countByFilter = (agents: readonly ListedAgent[]): Record<AgentFilter, number> => {
  const counts: Record<AgentFilter, number> = {
    all: agents.length,
    online: 0,
    offline: 0,
    never: 0,
    disabled: 0,
  };
  for (const agent of agents) counts[filterOfStatus(agentStatusOf(agent))] += 1;
  return counts;
};

/** The name or the host name holds the text, in any case. */
export const matchesSearch = (agent: Pick<AppEntity, 'name' | 'host'>, text: string): boolean => {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return [agent.name, agent.host?.hostname ?? ''].some(value =>
    value.toLowerCase().includes(needle),
  );
};

export interface AgentSummary {
  total: number;
  online: number;
  /** The jobs that the agents hold now. */
  runningJobs: number;
  offline: number;
  never: number;
}

/** The disabled agents count in the total only. */
export const summarizeAgents = (agents: readonly ListedAgent[]): AgentSummary => {
  const counts = countByFilter(agents);
  return {
    total: counts.all,
    online: counts.online,
    runningJobs: agents
      .filter(agent => !agent.disabledAt)
      .reduce((sum, agent) => sum + agent.runningJobs, 0),
    offline: counts.offline,
    never: counts.never,
  };
};

/** The ended jobs of each of the 30 days, oldest first. */
export const dailyJobs = (stats: Pick<AgentStats, 'days'>): number[] =>
  stats.days.map(day => endedJobs(day.outcomes));

/** The machines joined, and each key is revoked now: no machine can sign in. */
export const hasNoActiveKey = (keys: readonly { revokedAt: string }[]): boolean =>
  keys.length > 0 && keys.every(key => !!key.revokedAt);
