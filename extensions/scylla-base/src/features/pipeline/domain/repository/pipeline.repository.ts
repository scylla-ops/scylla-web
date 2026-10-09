import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type { PipelineEntity } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import type {
  PipelineMetadata,
  PipelineStep,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

export interface PipelineRepository {
  getMetadataByProjectId(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<PipelineMetadata>>>;
  /** One call for the whole organization, instead of one per project. */
  getMetadataByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<PaginatedList<PipelineMetadata>>>;
  deleteById(id: string): Promise<ScyllaResult<void>>;
  run(id: string): Promise<ScyllaResult<void>>;
  create(pipeline: Omit<PipelineEntity, 'id'>): Promise<ScyllaResult<void>>;
  getById(id: string): Promise<ScyllaResult<PipelineEntity>>;
  edit(id: string, steps: PipelineStep[], name?: string): Promise<ScyllaResult<PipelineEntity>>;
}
