import type { AgentMetrics } from '@base/features/dashboard/domain/structs/agent-metrics.struct.ts';

export interface AgentMetricsRepository {
  lastDay(agentId: string): Promise<AgentMetrics>;
}
