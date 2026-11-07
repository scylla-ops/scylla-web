import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type {
  PipelineEntity,
  PipelineMetadata,
  PipelineRun,
  PipelineWithLayout,
} from '../entities/pipeline.entity.ts';
import type { PipelineLayout } from '../structs/pipeline-layout.struct.ts';
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
  create(pipeline: Omit<PipelineEntity, 'id'>, layout?: PipelineLayout): Promise<void>;
  getById(id: string): Promise<PipelineEntity>;
  getWithLayout(id: string): Promise<PipelineWithLayout>;
  edit(
    id: string,
    nodes: PipelineNodeEntity[],
    name?: string,
    layout?: PipelineLayout,
  ): Promise<PipelineEntity>;
  /** Only the places that changed: the others stay. The version of the pipeline does not change. */
  saveLayout(id: string, layout: PipelineLayout): Promise<void>;
}
