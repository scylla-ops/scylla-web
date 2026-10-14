import type { IAgentAdminServiceClient } from '@base/generated/scylla/agent/v1/agent_admin.client.ts';
import type { IJobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import type {
  CreatedAgent,
  AgentStats,
} from '@base/features/agents/domain/structs/agent.struct.ts';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import type {
  AgentJob,
  PipelineName,
} from '@base/features/agents/domain/structs/agent-job.struct.ts';
import type { AgentsRepository } from '@base/features/agents/domain/repository/agents.repository.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import { idValue, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { GrpcAgentMapper } from './grpc-agent.mapper.ts';

/** One page for the whole organization, as the pipeline lookups of `pipeline`. */
const PIPELINE_NAMES_PAGE_SIZE = 100;

export class DefaultAgentsRepository implements AgentsRepository {
  constructor(
    private readonly client: IAgentAdminServiceClient,
    private readonly jobs: IJobServiceClient,
    private readonly pipelines: IPipelineServiceClient,
  ) {}

  listAgents(organizationId: string): Promise<ScyllaResult<AgentEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listAgents({ organizationId: wrapId(organizationId) })
        .response;
      return response.agents.map(agent => GrpcAgentMapper.toDomain(agent));
    }, 'Failed to list agents');
  }

  getAgent(agentId: string): Promise<ScyllaResult<AgentEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.getAgent({ agentId: wrapId(agentId) }).response;
      if (!response.agent) throw new Error('GetAgent returned no agent');
      return GrpcAgentMapper.toDomain(response.agent);
    }, 'Failed to fetch agent');
  }

  getAgentStats(agentId: string): Promise<ScyllaResult<AgentStats>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.getAgentStats({ agentId: wrapId(agentId) }).response;
      if (!response.stats) throw new Error('GetAgentStats returned no stats');
      return GrpcAgentMapper.statsToDomain(response.stats);
    }, 'Failed to fetch agent stats');
  }

  createAgent(organizationId: string, name: string): Promise<ScyllaResult<CreatedAgent>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.createAgent({
        organizationId: wrapId(organizationId),
        name,
      }).response;
      if (!response.agent) throw new Error('CreateAgent returned no agent');
      return { agent: GrpcAgentMapper.toDomain(response.agent), secret: response.secret };
    }, 'Failed to create agent');
  }

  deleteAgent(agentId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteAgent({ agentId: wrapId(agentId) }).response;
    }, 'Failed to delete agent');
  }

  listJobs(
    organizationId: string,
    agentId: string,
    limit: number,
  ): Promise<ScyllaResult<AgentJob[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.jobs.listOrganizationJobs({
        organizationId: wrapId(organizationId),
        agentId: wrapId(agentId),
        pagination: { page: 1, pageSize: limit },
      }).response;
      return response.jobs.map(job => GrpcAgentMapper.jobToDomain(job));
    }, 'Failed to list the jobs of the agent');
  }

  listPipelineNames(organizationId: string): Promise<ScyllaResult<PipelineName[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.pipelines.listOrganizationPipelines({
        organizationId: wrapId(organizationId),
        pagination: { page: 1, pageSize: PIPELINE_NAMES_PAGE_SIZE },
      }).response;
      return response.pipelines.map(pipeline => ({
        id: idValue(pipeline.pipelineId),
        projectId: idValue(pipeline.projectId),
        name: pipeline.name,
      }));
    }, 'Failed to list the pipelines');
  }
}
