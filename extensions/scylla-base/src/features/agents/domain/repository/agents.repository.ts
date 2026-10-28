import type {
  CreatedAgent,
  AgentStats,
  AgentEntity,
  AgentJob,
  AgentJobPipeline,
} from '@base/features/agents/domain/entities/agent.entity.ts';

export interface AgentsRepository {
  listAgents(organizationId: string): Promise<AgentEntity[]>;
  getAgent(agentId: string): Promise<AgentEntity>;
  getAgentStats(agentId: string): Promise<AgentStats>;
  /** CE labels the first secret with the name. */
  createAgent(organizationId: string, name: string): Promise<CreatedAgent>;
  deleteAgent(agentId: string): Promise<void>;
  /** The latest jobs the server placed on the agent, at any state, newest first. */
  listJobs(organizationId: string, agentId: string, limit: number): Promise<AgentJob[]>;
  /** The pipelines of the organization, for the names of the recent jobs. */
  listPipelineNames(organizationId: string): Promise<AgentJobPipeline[]>;
}
