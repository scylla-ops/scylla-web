import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type { PipelineEntity, PipelineMetadata } from '../entities/pipeline.entity.ts';
import type { PipelineNodeEntity } from '../entities/pipeline-node.entity.ts';

export interface PipelineRepository {
  getMetadataByProjectId(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<PipelineMetadata>>;
  /** One call for the whole organization, instead of one per project. */
  getMetadataByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<PipelineMetadata>>;
  deleteById(id: string): Promise<void>;
  run(id: string): Promise<void>;
  create(pipeline: Omit<PipelineEntity, 'id'>): Promise<void>;
  getById(id: string): Promise<PipelineEntity>;
  edit(id: string, nodes: PipelineNodeEntity[], name?: string): Promise<PipelineEntity>;
}
