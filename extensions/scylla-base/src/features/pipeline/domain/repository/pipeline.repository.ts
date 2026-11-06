import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type { PipelineEntity, PipelineMetadata, PipelineRun } from '../entities/pipeline.entity.ts';
import type { PipelineNodeEntity } from '../entities/pipeline-node.entity.ts';

export interface PipelineRepository {
  getMetadataByProjectId(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<PipelineMetadata>>;
  /** One call for the whole workspace, instead of one per project. */
  getMetadataByWorkspaceId(
    workspaceId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedList<PipelineMetadata>>;
  deleteById(id: string): Promise<void>;
  run(id: string): Promise<PipelineRun>;
  create(pipeline: Omit<PipelineEntity, 'id'>): Promise<void>;
  getById(id: string): Promise<PipelineEntity>;
  edit(id: string, nodes: PipelineNodeEntity[], name?: string): Promise<PipelineEntity>;
}
