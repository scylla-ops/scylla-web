import type { CommitRef } from '../domain/structs/commit-ref.struct.ts';
import type { PipelineFileFormat } from '../domain/structs/pipeline-file-format.struct.ts';
import type { PaginationParams } from '@scylla/ui/structs';

export const PIPELINES_QUERY_KEY = (projectId: string, pagination?: PaginationParams) =>
  ['pipelines', projectId, pagination] as const;

/** Under the `'pipelines'` root: invalidating it refreshes both scopes. */
export const WORKSPACE_PIPELINES_QUERY_KEY = (
  workspaceId: string | null,
  pagination?: PaginationParams,
) => ['pipelines', 'workspace', workspaceId, pagination] as const;

/** Under the `'pipelines'` root: a create, an edit or a delete refreshes it. */
export const WORKSPACE_PIPELINE_SUMMARIES_QUERY_KEY = (workspaceId: string | null, shape: object) =>
  ['pipelines', 'workspace', workspaceId, 'summaries', shape] as const;

export const PROJECT_PIPELINES_QUERY_ROOT = (projectId: string) =>
  ['pipelines', projectId] as const;

export const PIPELINES_QUERY_ROOT = ['pipelines'] as const;

/** Under the pipelines of the project: a write of a pipeline refreshes the keys too. */
export const PIPELINE_FILE_KEYS_QUERY_KEY = (projectId: string) =>
  ['pipelines', projectId, 'file-keys'] as const;

export const PIPELINE_QUERY_KEY = (pipelineId: string) => ['pipeline', pipelineId] as const;

/** Under the key of the pipeline: a save refreshes the files too. */
export const PIPELINE_EXPORT_QUERY_KEY = (pipelineId: string, format: PipelineFileFormat) =>
  ['pipeline', pipelineId, 'export', format] as const;

/** Under the key of the pipeline. No ref: the head of the default branch. */
export const PIPELINE_FILE_QUERY_KEY = (pipelineId: string, ref?: CommitRef) =>
  ['pipeline', pipelineId, 'file', ref ?? null] as const;

/** The templates do not depend on the project, nor on a pipeline: a root of their own. */
export const NODE_TEMPLATES_QUERY_KEY = () => ['node-templates'] as const;

export const CREATE_PIPELINE_MUTATION_KEY = ['pipeline', 'create'] as const;
export const RUN_PIPELINE_MUTATION_KEY = ['pipeline', 'run'] as const;

/** The libraries: a root of their own. A save of the links of a pipeline refreshes their usages. */
export const FRAGMENTS_QUERY_ROOT = ['fragments'] as const;

export const FRAGMENTS_QUERY_KEY = (workspaceId: string) => [...FRAGMENTS_QUERY_ROOT, workspaceId] as const;

/** Under the library: a new version or a favorite refreshes both. */
export const FRAGMENT_QUERY_KEY = (workspaceId: string, fragmentId: string) =>
  [...FRAGMENTS_QUERY_KEY(workspaceId), fragmentId] as const;

export const FRAGMENT_LINKS_QUERY_KEY = (pipelineId: string) =>
  ['fragment-links', pipelineId] as const;
