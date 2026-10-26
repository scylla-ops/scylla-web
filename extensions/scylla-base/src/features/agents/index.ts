/** `agentQueries` checks `LIST_AGENTS` itself. */
export type {
  AgentEntity,
  AgentStats,
  CreatedAgent,
  DailyOutcome,
} from './domain/entities/agent.entity.ts';
export {
  agentQueries,
  agentMutations,
  AGENTS_QUERY_KEY,
  AGENT_QUERY_KEY,
  AGENT_STATS_QUERY_KEY,
  CREATE_AGENT_MUTATION_KEY,
} from './presentation/agents.queries.ts';
/** A loader: a barrel must not re-export a component. */
export const loadNoAgentsBanner = () =>
  import('./presentation/ui/components/NoAgentsBanner.svelte');
