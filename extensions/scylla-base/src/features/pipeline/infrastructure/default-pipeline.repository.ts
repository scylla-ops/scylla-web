import type { PipelineRepository } from '@base/features/pipeline/domain/repository/pipeline.repository.ts';
import type { PipelineEntity } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import type {
  PipelineMetadata,
  PipelineStep,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import type { Pipeline } from '@base/generated/scylla/pipeline/v1/pipeline.ts';
import { DEFAULT_PAGE_SIZE, type PaginatedList, type PaginationParams } from '@scylla/ui/structs';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { GrpcPipelineMapper } from './grpc-pipeline.mapper.ts';

/** The wrapped entity is optional on the wire: fail here rather than pass `undefined` to a mapper. */
const requirePipeline = (pipeline: Pipeline | undefined): PipelineEntity => {
  if (!pipeline) throw new Error('Server response carried no pipeline');
  return GrpcPipelineMapper.toDomain(pipeline);
};

export class DefaultPipelineRepository implements PipelineRepository {
  constructor(private readonly client: IPipelineServiceClient) {}

  public getMetadataByProjectId(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<PipelineMetadata>>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listProjectPipelines({
        projectId: wrapId(projectId),
        pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
      }).response;
      return GrpcPipelineMapper.toDomainInfoList(response);
    }, 'Error getting pipelines');
  }

  public getMetadataByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<PipelineMetadata>>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listOrganizationPipelines({
        organizationId: wrapId(organizationId),
        pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
      }).response;
      return GrpcPipelineMapper.toDomainInfoList(response);
    }, 'Error getting organization pipelines');
  }

  public deleteById(id: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deletePipeline({ pipelineId: wrapId(id) }).response;
    }, 'Error deleting pipeline');
  }

  /** The returned job id is not needed: callers refetch the job list. */
  public run(id: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.runPipeline({ pipelineId: wrapId(id) }).response;
    }, 'Error running pipeline');
  }

  public create(pipeline: Omit<PipelineEntity, 'id'>): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.createPipeline({
        name: pipeline.name,
        projectId: wrapId(pipeline.projectId),
        nodes: pipeline.nodes.map(GrpcPipelineMapper.nodeFromDomain),
      }).response;
    }, 'Failed to create pipeline.');
  }

  public getById(id: string): Promise<ScyllaResult<PipelineEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.getPipeline({ pipelineId: wrapId(id) }).response;
      return requirePipeline(response.pipeline);
    }, 'Error getting pipeline');
  }

  public edit(
    id: string,
    steps: PipelineStep[],
    name?: string,
  ): Promise<ScyllaResult<PipelineEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.updatePipeline({
        pipelineId: wrapId(id),
        nodes: steps.map(GrpcPipelineMapper.nodeFromDomain),
        name,
      }).response;
      return requirePipeline(response.pipeline);
    }, 'Failed to edit pipeline.');
  }
}
