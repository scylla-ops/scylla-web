import type { IAgentAdminServiceClient } from '@base/generated/scylla/agent/v1/agent_admin.client.ts';
import type { IJobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import type {
  CreatedAgent,
  AgentStats,
  AgentEntity,
  AgentJob,
  AgentJobPipeline,
} from '@base/features/agents/domain/entities/agent.entity.ts';
import type { AgentsRepository } from '@base/features/agents/domain/repository/agents.repository.ts';
import { idValue, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcAgent from './grpc-agent.mapper.ts';

/** One page for the whole organization, as the pipeline lookups of `pipeline`. */
const PIPELINE_NAMES_PAGE_SIZE = 100;

export class DefaultAgentsRepository implements AgentsRepository {
  constructor(
    private readonly client: IAgentAdminServiceClient,
    private readonly jobs: IJobServiceClient,
    private readonly pipelines: IPipelineServiceClient,
  ) {}

  async listAgents(organizationId: string): Promise<AgentEntity[]> {
    const response = await this.client.listAgents({ organizationId: wrapId(organizationId) })
      .response;
    return response.agents.map(agent => grpcAgent.toDomain(agent));
  }

  async getAgent(agentId: string): Promise<AgentEntity> {
    const response = await this.client.getAgent({ agentId: wrapId(agentId) }).response;
    if (!response.agent) throw new Error('GetAgent returned no agent');
    return grpcAgent.toDomain(response.agent);
  }

  async getAgentStats(agentId: string): Promise<AgentStats> {
    const response = await this.client.getAgentStats({ agentId: wrapId(agentId) }).response;
    if (!response.stats) throw new Error('GetAgentStats returned no stats');
    return grpcAgent.statsToDomain(response.stats);
  }

  async createAgent(organizationId: string, name: string): Promise<CreatedAgent> {
    const response = await this.client.createAgent({
      organizationId: wrapId(organizationId),
      name,
    }).response;
    if (!response.agent) throw new Error('CreateAgent returned no agent');
    return { agent: grpcAgent.toDomain(response.agent), secret: response.secret };
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.client.deleteAgent({ agentId: wrapId(agentId) }).response;
  }

  async listJobs(organizationId: string, agentId: string, limit: number): Promise<AgentJob[]> {
    const response = await this.jobs.listOrganizationJobs({
      organizationId: wrapId(organizationId),
      agentId: wrapId(agentId),
      pagination: { page: 1, pageSize: limit },
    }).response;
    return response.jobs.map(job => grpcAgent.jobToDomain(job));
  }

  async listPipelineNames(organizationId: string): Promise<AgentJobPipeline[]> {
    const response = await this.pipelines.listOrganizationPipelines({
      organizationId: wrapId(organizationId),
      pagination: { page: 1, pageSize: PIPELINE_NAMES_PAGE_SIZE },
    }).response;
    return response.pipelines.map(pipeline => ({
      id: idValue(pipeline.pipelineId),
      projectId: idValue(pipeline.projectId),
      name: pipeline.name,
    }));
  }
}
