import type { PipelineRepository } from '@base/features/pipeline/domain/repository/pipeline.repository.ts';
import type {
  PipelineEntity,
  PipelineMetadata,
  PipelineRun,
  PipelineWithLayout,
} from '../domain/entities/pipeline.entity.ts';
import type { PipelineLayout } from '../domain/structs/pipeline-layout.struct.ts';
import type { PipelineNodeEntity } from '../domain/entities/pipeline-node.entity.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { Pipeline } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { DEFAULT_PAGE_SIZE, type PaginatedList, type PaginationParams } from '@scylla/ui/structs';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcPipeline from './grpc-pipeline.mapper.ts';

const PAGE_SIZE = 100;
const FIRST_PAGE: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE };

/** Reads each page of a list. */
const allPages = async (
  read: (token: string) => Promise<{ pipelines: Pipeline[]; next: string }>,
): Promise<Pipeline[]> => {
  const items: Pipeline[] = [];
  let token = '';
  do {
    const page = await read(token);
    items.push(...page.pipelines);
    token = page.next;
  } while (token);
  return items;
};

export class DefaultPipelineRepository implements PipelineRepository {
  /**
   * The version of each pipeline that this client read. `UpdatePipeline` sends it back: a pipeline
   * that changed since gives ABORTED, and the editor reads it again.
   */
  private readonly versions = new Map<string, bigint>();

  constructor(private readonly client: IPipelineServiceClient) {}

  private keep(response: Pipeline | undefined): PipelineEntity {
    const pipeline = required(response, 'pipeline');
    const entity = grpcPipeline.toDomain(pipeline);
    this.versions.set(entity.id, pipeline.version);
    return entity;
  }

  public async getMetadataByProjectId(
    projectId: string,
    pagination: PaginationParams = FIRST_PAGE,
  ): Promise<PaginatedList<PipelineMetadata>> {
    const pipelines = await allPages(async token => {
      const response = await this.client.listProjectPipelines({
        projectId: wrapId(projectId),
        page: { size: PAGE_SIZE, token },
      }).response;
      return { pipelines: response.pipelines, next: response.page?.nextToken ?? '' };
    });
    return grpcPipeline.toMetadataPage(pipelines, pagination);
  }

  public async getMetadataByWorkspaceId(
    workspaceId: string,
    pagination: PaginationParams = FIRST_PAGE,
  ): Promise<PaginatedList<PipelineMetadata>> {
    const pipelines = await allPages(async token => {
      const response = await this.client.listWorkspacePipelines({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      return { pipelines: response.pipelines, next: response.page?.nextToken ?? '' };
    });
    return grpcPipeline.toMetadataPage(pipelines, pagination);
  }

  public async deleteById(id: string): Promise<void> {
    await this.client.deletePipeline({ pipelineId: wrapId(id) }).response;
    this.versions.delete(id);
  }

  public async run(id: string): Promise<PipelineRun> {
    const { job } = await this.client.runPipeline({ pipelineId: wrapId(id) }).response;
    return { needsContainer: (job?.nodes ?? []).some(node => !!node.container?.image) };
  }

  public async create(pipeline: Omit<PipelineEntity, 'id'>, layout?: PipelineLayout): Promise<void> {
    const response = await this.client.createPipeline({
      name: pipeline.name,
      projectId: wrapId(pipeline.projectId),
      nodes: pipeline.nodes.map(grpcPipeline.nodeFromDomain),
      ...(layout && { layout: grpcPipeline.layoutFromDomain(layout) }),
    }).response;
    this.keep(response.pipeline);
  }

  public async getById(id: string): Promise<PipelineEntity> {
    const response = await this.client.getPipeline({ pipelineId: wrapId(id) }).response;
    return this.keep(response.pipeline);
  }

  public async getWithLayout(id: string): Promise<PipelineWithLayout> {
    const response = await this.client.getPipeline({ pipelineId: wrapId(id) }).response;
    return {
      pipeline: this.keep(response.pipeline),
      layout: grpcPipeline.layoutToDomain(response.layout),
    };
  }

  public async saveLayout(id: string, layout: PipelineLayout): Promise<void> {
    await this.client.savePipelineLayout({
      pipelineId: wrapId(id),
      layout: grpcPipeline.layoutFromDomain(layout),
    }).response;
  }

  public async edit(
    id: string,
    nodes: PipelineNodeEntity[],
    name?: string,
    layout?: PipelineLayout,
  ): Promise<PipelineEntity> {
    // A pipeline that this client never read: read it first, for its version.
    if (!this.versions.has(id)) await this.getById(id);
    const response = await this.client.updatePipeline({
      pipelineId: wrapId(id),
      version: this.versions.get(id) ?? 0n,
      nodes: { nodes: nodes.map(grpcPipeline.nodeFromDomain) },
      ...(name !== undefined && { name }),
      ...(layout && { layout: grpcPipeline.layoutFromDomain(layout) }),
    }).response;
    return this.keep(response.pipeline);
  }
}
