import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type {
  PipelineEntity,
  PipelineFileExport,
  PipelineMetadata,
  PipelineRun,
  PipelineWithLayout,
} from '../entities/pipeline.entity.ts';
import type { CommitRef } from '../structs/commit-ref.struct.ts';
import type { PipelineFile } from '../structs/pipeline-file.struct.ts';
import type { PipelineFileFormat } from '../structs/pipeline-file-format.struct.ts';
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
  /** No ref: an editor pipeline runs with no commit, a file pipeline at the head of the default branch. */
  run(id: string, ref?: CommitRef): Promise<PipelineRun>;
  /** The file of a file pipeline at a commit. No ref: the head of the default branch. */
  getFile(id: string, ref?: CommitRef): Promise<PipelineFile>;
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
  /** The saved version, as a file to put in the repository. */
  exportFile(id: string, format: PipelineFileFormat): Promise<PipelineFileExport>;
}
