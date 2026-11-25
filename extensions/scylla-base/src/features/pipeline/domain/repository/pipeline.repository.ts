import type { FragmentLink } from '../entities/fragment.entity.ts';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import type {
  PipelineEntity,
  PipelineFileExport,
  PipelineMetadata,
  PipelineOrigin,
  PipelineRun,
  PipelineWithLayout,
} from '../entities/pipeline.entity.ts';
import type { CommitRef } from '../structs/commit-ref.struct.ts';
import type { PipelineFile } from '../structs/pipeline-file.struct.ts';
import type { PipelineFileFormat } from '../structs/pipeline-file-format.struct.ts';
import type { PipelineFileKey } from '../structs/pipeline-key.struct.ts';
import type { PipelineLayout } from '../structs/pipeline-layout.struct.ts';
import type {
  PipelineSummaryList,
  PipelineSummaryQuery,
} from '../structs/pipeline-summary.struct.ts';
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
  /** The pipelines of a workspace with their last jobs and their health, in the order asked. */
  getSummaries(query: PipelineSummaryQuery): Promise<PipelineSummaryList>;
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
    /** The fragment links: they replace all the links. None: the links stay. */
    links?: FragmentLink[],
  ): Promise<PipelineEntity>;
  /**
   * Replaces the labels that the agent of a job must have, with a new version of the pipeline.
   * An empty list removes them. The nodes stay.
   */
  setAgentLabels(id: string, labels: readonly string[]): Promise<PipelineEntity>;
  /** Only the places that changed: the others stay. The version of the pipeline does not change. */
  saveLayout(id: string, layout: PipelineLayout): Promise<void>;
  /** The saved version, as a file to put in the repository. */
  exportFile(id: string, format: PipelineFileFormat): Promise<PipelineFileExport>;
  /** The keys of the pipeline files at the head of the default branch of the linked repository. */
  listFileKeys(projectId: string): Promise<PipelineFileKey[]>;
  /**
   * Lets the push, pull request and tag triggers of an editor pipeline start runs in a project of
   * files, or stops them. The admins of the workspace only. The version does not change.
   */
  setGitEvents(id: string, allowed: boolean): Promise<PipelineOrigin>;
}
