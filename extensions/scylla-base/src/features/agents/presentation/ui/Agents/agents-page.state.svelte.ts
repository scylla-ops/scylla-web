import { Permission, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQueries, createQuery } from '@scylla/core-sdk';
import { createNow } from '@scylla/ui/state';
import { toRune } from '@scylla/ui/stores';
import { appQueries, type AppAccess } from '@base/features/apps';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import type { AgentStats } from '@base/features/agents/domain/structs/agent.struct.ts';
import {
  isOnline,
  type AgentState,
} from '@base/features/agents/domain/structs/agent-state.struct.ts';
import { agentStateOf } from '@base/features/agents/domain/entities/agent.entity.ts';
import { summarizeAgents } from '@base/features/agents/presentation/presenters/agents-summary.presenter.ts';
import { agentQueries } from '@base/features/agents/presentation/agents.queries.ts';

export type AgentFilter = 'all' | 'online' | 'offline' | 'never' | 'disabled';

export const AGENT_FILTERS: readonly AgentFilter[] = [
  'all',
  'online',
  'offline',
  'never',
  'disabled',
];

export interface AgentRow {
  agent: AgentEntity;
  state: AgentState;
  /** `undefined` while loading, or without `READ_APP_STATS`. */
  stats: AgentStats | undefined;
  /** `undefined` while loading, or without `READ_APP`. */
  access: AppAccess[] | undefined;
}

const matchesFilter = (state: AgentState, filter: AgentFilter): boolean =>
  filter === 'all' || (filter === 'online' ? isOnline(state) : state === filter);

const matchesSearch = (agent: AgentEntity, search: string): boolean => {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    agent.name.toLowerCase().includes(needle) ||
    (agent.host?.hostname.toLowerCase().includes(needle) ?? false)
  );
};

/** The agents of the organization, with their stats and grants, one query each. */
export const createAgentsPage = () => {
  const context = toRune(contextStore);
  const organizationId = $derived(context().organization.id ?? '');

  const agentsQuery = createQuery(() => agentQueries.byOrganization(organizationId));
  const agents = $derived(agentsQuery.data ?? []);

  const statsResults = createQueries(() => ({
    queries: agents.map(agent => agentQueries.statsOf(agent.id)),
  }));
  const accessResults = createQueries(() => ({
    queries: agents.map(agent => appQueries.accessOf(agent.id)),
  }));

  // Relative times ("Seen 2 min ago") move on without a refetch.
  const now = createNow(() => true, 30_000);

  let filter = $state<AgentFilter>('all');
  let search = $state('');

  const rows = $derived.by((): AgentRow[] => {
    const stats = [...statsResults];
    const access = [...accessResults];
    return agents.map((agent, index) => ({
      agent,
      state: agentStateOf(agent),
      stats: stats[index]?.data,
      access: access[index]?.data,
    }));
  });

  const counts = $derived(
    Object.fromEntries(
      AGENT_FILTERS.map(option => [
        option,
        rows.filter(row => matchesFilter(row.state, option)).length,
      ]),
    ) as Record<AgentFilter, number>,
  );

  const visibleRows = $derived(
    rows.filter(row => matchesFilter(row.state, filter) && matchesSearch(row.agent, search)),
  );

  /** A partial sum reads as a real one: the tile waits for every agent, and says who is missing. */
  const statsProgress = $derived.by(() => {
    const results = [...statsResults];
    return {
      loading: results.some(result => result.isLoading),
      failed: results.filter(result => result.isError).length,
    };
  });

  const summary = $derived(
    summarizeAgents(agents, agentId => rows.find(row => row.agent.id === agentId)?.stats),
  );

  return {
    get organizationId() {
      return organizationId;
    },
    get isLoading() {
      return agentsQuery.isLoading;
    },
    get isError() {
      return agentsQuery.isError;
    },
    get agents() {
      return agents;
    },
    get rows() {
      return visibleRows;
    },
    get counts() {
      return counts;
    },
    get summary() {
      return summary;
    },
    get statsLoading() {
      return statsProgress.loading;
    },
    /** The agents whose stats failed: the 30-day sum does not count them. */
    get statsFailed() {
      return statsProgress.failed;
    },
    get filter() {
      return filter;
    },
    set filter(value: AgentFilter) {
      filter = value;
    },
    get search() {
      return search;
    },
    set search(value: string) {
      search = value;
    },
    get now() {
      return now.value;
    },
    get canCreate() {
      return can(Permission.CREATE_AGENT);
    },
    get canReadStats() {
      return can(Permission.READ_APP_STATS);
    },
    get canReadAccess() {
      return can(Permission.READ_APP);
    },
  };
};

export type AgentsPage = ReturnType<typeof createAgentsPage>;
