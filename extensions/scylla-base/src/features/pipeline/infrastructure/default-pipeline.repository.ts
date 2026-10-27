import type { PipelineRepository } from '@base/features/pipeline/domain/repository/pipeline.repository.ts';
import type { PipelineEntity, PipelineMetadata } from '../domain/entities/pipeline.entity.ts';
import type { PipelineNodeEntity } from '../domain/entities/pipeline-node.entity.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import type { Pipeline } from '@base/generated/scylla/pipeline/v1/pipeline.ts';
import { DEFAULT_PAGE_SIZE, type PaginatedList, type PaginationParams } from '@scylla/ui/structs';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcPipeline from './grpc-pipeline.mapper.ts';

/** The wrapped entity is optional on the wire: fail here rather than pass `undefined` to a mapper. */
const requirePipeline = (pipeline: Pipeline | undefined): PipelineEntity => {
  if (!pipeline) throw new Error('Server response carried no pipeline');
  return grpcPipeline.toDomain(pipeline);
};

export class DefaultPipelineRepository implements PipelineRepository {
  constructor(private readonly client: IPipelineServiceClient) {}

  public async getMetadataByProjectId(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<PipelineMetadata>> {
    const response = await this.client.listProjectPipelines({
      projectId: wrapId(projectId),
      pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    }).response;
    return grpcPipeline.toMetadataList(response);
  }

  public async getMetadataByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<PipelineMetadata>> {
    const response = await this.client.listOrganizationPipelines({
      organizationId: wrapId(organizationId),
      pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    }).response;
    return grpcPipeline.toMetadataList(response);
  }

  public async deleteById(id: string): Promise<void> {
    await this.client.deletePipeline({ pipelineId: wrapId(id) }).response;
  }

  /** The returned job id is not needed: callers refetch the job list. */
  public async run(id: string): Promise<void> {
    await this.client.runPipeline({ pipelineId: wrapId(id) }).response;
  }

  public async create(pipeline: Omit<PipelineEntity, 'id'>): Promise<void> {
    await this.client.createPipeline({
      name: pipeline.name,
      projectId: wrapId(pipeline.projectId),
      nodes: pipeline.nodes.map(grpcPipeline.nodeFromDomain),
    }).response;
  }

  public async getById(id: string): Promise<PipelineEntity> {
    const response = await this.client.getPipeline({ pipelineId: wrapId(id) }).response;
    return requirePipeline(response.pipeline);
  }

  public async edit(
    id: string,
    nodes: PipelineNodeEntity[],
    name?: string,
  ): Promise<PipelineEntity> {
    const response = await this.client.updatePipeline({
      pipelineId: wrapId(id),
      nodes: nodes.map(grpcPipeline.nodeFromDomain),
      name,
    }).response;
    return requirePipeline(response.pipeline);
  }
}
