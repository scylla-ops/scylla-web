import type {
  AgentEntity,
  AgentStats,
  DailyOutcome,
} from '@base/features/agents/domain/entities/agent.entity.ts';
import { isOnline } from '@base/features/agents/domain/structs/agent-state.struct.ts';
import { agentStateOf } from '@base/features/agents/domain/entities/agent.entity.ts';

export interface Outcomes {
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
  /** Every finished job: the four outcomes. */
  total: number;
}

export const sumOutcomes = (daily: readonly DailyOutcome[]): Outcomes => {
  const sums = daily.reduce(
    (acc, day) => ({
      completed: acc.completed + day.completed,
      failed: acc.failed + day.failed,
      cancelled: acc.cancelled + day.cancelled,
      orphaned: acc.orphaned + day.orphaned,
    }),
    { completed: 0, failed: 0, cancelled: 0, orphaned: 0 },
  );
  return { ...sums, total: sums.completed + sums.failed + sums.cancelled + sums.orphaned };
};

/** `null` when nothing finished: that is not 0 %. */
export const successRateOf = (outcomes: Outcomes): number | null =>
  outcomes.total === 0 ? null : outcomes.completed / outcomes.total;

export interface AgentsSummary {
  total: number;
  online: number;
  /** Agents that run a job now. */
  running: number;
  runningJobs: number;
  runningNames: string[];
  offline: number;
  never: number;
  /** The last 30 days of every agent whose stats are known. */
  outcomes: Outcomes;
}

export const summarizeAgents = (
  agents: readonly AgentEntity[],
  statsOf: (agentId: string) => AgentStats | undefined,
): AgentsSummary => {
  const states = agents.map(agent => ({ agent, state: agentStateOf(agent) }));
  const running = states.filter(({ state }) => state === 'running').map(({ agent }) => agent);

  return {
    total: agents.length,
    online: states.filter(({ state }) => isOnline(state)).length,
    running: running.length,
    runningJobs: running.reduce((sum, agent) => sum + agent.inFlight, 0),
    runningNames: running.map(agent => agent.name),
    offline: states.filter(({ state }) => state === 'offline').length,
    never: states.filter(({ state }) => state === 'never').length,
    outcomes: sumOutcomes(agents.flatMap(agent => statsOf(agent.id)?.daily ?? [])),
  };
};
