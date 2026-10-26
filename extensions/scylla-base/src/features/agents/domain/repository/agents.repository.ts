import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type {
  CreatedAgent,
  AgentStats,
  AgentEntity,
  AgentJob,
  PipelineName,
} from '@base/features/agents/domain/entities/agent.entity.ts';

export interface AgentsRepository {
  listAgents(organizationId: string): Promise<ScyllaResult<AgentEntity[]>>;
  getAgent(agentId: string): Promise<ScyllaResult<AgentEntity>>;
  getAgentStats(agentId: string): Promise<ScyllaResult<AgentStats>>;
  /** CE labels the first secret with the name. */
  createAgent(organizationId: string, name: string): Promise<ScyllaResult<CreatedAgent>>;
  deleteAgent(agentId: string): Promise<ScyllaResult<void>>;
  /** The latest jobs the server placed on the agent, at any state, newest first. */
  listJobs(
    organizationId: string,
    agentId: string,
    limit: number,
  ): Promise<ScyllaResult<AgentJob[]>>;
  /** The pipelines of the organization, for the names of the recent jobs. */
  listPipelineNames(organizationId: string): Promise<ScyllaResult<PipelineName[]>>;
}
