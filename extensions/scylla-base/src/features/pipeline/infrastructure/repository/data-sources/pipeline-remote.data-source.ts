import type {
  CreatePipelineRequest,
  ListOrganizationPipelinesResponse,
  ListProjectPipelinesResponse,
  Pipeline,
  PipelineNode,
} from '@base/generated/scylla/pipeline/v1/pipeline.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PaginationParams } from '@scylla/ui/structs';

export interface PipelineRemoteDataSource {
  getByProjectId(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ListProjectPipelinesResponse>>;
  getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ListOrganizationPipelinesResponse>>;
  deleteById(id: string): Promise<ScyllaResult<void>>;
  run(id: string): Promise<ScyllaResult<void>>;
  create(request: CreatePipelineRequest): Promise<ScyllaResult<void>>;
  getById(id: string): Promise<ScyllaResult<Pipeline>>;
  update(id: string, nodes: PipelineNode[], name?: string): Promise<ScyllaResult<Pipeline>>;
}
