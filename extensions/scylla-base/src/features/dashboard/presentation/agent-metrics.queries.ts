import { getModuleDomain, queryOptions } from '@scylla/core-sdk';
import type { AgentMetricsRepository } from '../domain/repository/agent-metrics.repository.ts';
import type { AgentMetrics } from '../domain/structs/agent-metrics.struct.ts';

const repository = () =>
  getModuleDomain<{ agentMetricsRepository: AgentMetricsRepository }>('dashboard').agentMetricsRepository;

const REFRESH_MS = 60_000;

export const agentMetricsQueries = {
  lastDay: (agentId: string | null, enabled = true) =>
    queryOptions<AgentMetrics>({
      queryKey: ['dashboard', 'agent-metrics', agentId] as const,
      queryFn: () => repository().lastDay(agentId ?? ''),
      enabled: enabled && !!agentId,
      staleTime: REFRESH_MS / 2,
      refetchInterval: REFRESH_MS,
    }),
};
