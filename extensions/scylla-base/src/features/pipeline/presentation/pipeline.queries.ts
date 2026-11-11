import { i18n } from '@lingui/core';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { scyllaNavigate, contextStore } from '@platform/context';
import { JOBS_QUERY_KEY } from '@base/features/jobs';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import { toast } from '@scylla/ui/utils';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type {
  PipelineFileExport,
  PipelineMetadata,
  PipelineWithLayout,
} from '../domain/entities/pipeline.entity.ts';
import type { PipelineFileFormat } from '../domain/structs/pipeline-file-format.struct.ts';
import { mergeLayouts, type PipelineLayout } from '../domain/structs/pipeline-layout.struct.ts';
import {
  InvalidPipelineError,
  type SavePipelineInput,
} from '../domain/use-cases/save-pipeline.use-case.ts';
import type { NodeTemplateEntity } from '../domain/entities/node-template.entity.ts';
import type { PipelineModule } from '../pipeline.module.ts';
import { pipelineMessages } from './messages/pipeline.messages.ts';
import { pipelineIssueText } from './presenters/pipeline-issue.presenter.ts';
import {
  CREATE_PIPELINE_MUTATION_KEY,
  WORKSPACE_PIPELINES_QUERY_KEY,
  PIPELINES_QUERY_KEY,
  PIPELINES_QUERY_ROOT,
  PIPELINE_EXPORT_QUERY_KEY,
  PIPELINE_QUERY_KEY,
  PROJECT_PIPELINES_QUERY_ROOT,
  RUN_PIPELINE_MUTATION_KEY,
  NODE_TEMPLATES_QUERY_KEY,
} from './pipeline.query-keys.ts';

//todo: check about split this file into multiple .queries to improve readability

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof PipelineModule.domain>('pipeline').pipelineRepository;

const savePipeline = () => getModuleDomain<typeof PipelineModule.domain>('pipeline').savePipeline;

const templateRepository = () =>
  getModuleDomain<typeof PipelineModule.domain>('pipeline').nodeTemplateRepository;

const currentProject = () => contextStore.getState().project;

/** One request for a project's whole list, on the overview pages. */
const PIPELINES_LOOKUP_PAGE: PaginationParams = { page: 1, pageSize: 100 };

const ALL_PIPELINES: PaginationParams = { page: 1, pageSize: Number.MAX_SAFE_INTEGER };

export const pipelineQueries = {
  /** `enabled`: wait until the page size is measured, or the first page is fetched twice. */
  byProject: (
    projectId: string,
    pagination: PaginationParams,
    options: { enabled?: boolean } = {},
  ) =>
    queryOptions<PaginatedList<PipelineMetadata>>({
      queryKey: PIPELINES_QUERY_KEY(projectId, pagination),
      enabled: (options.enabled ?? true) && !!projectId,
      queryFn: () => repository().getMetadataByProjectId(projectId, pagination),
      staleTime: 5_000,
    }),

  /** One call, scoped by the backend: nothing to gate here. */
  byWorkspace: (workspaceId: string | null) =>
    queryOptions<PaginatedList<PipelineMetadata>>({
      queryKey: WORKSPACE_PIPELINES_QUERY_KEY(workspaceId, PIPELINES_LOOKUP_PAGE),
      enabled: !!workspaceId,
      queryFn: () =>
        repository().getMetadataByWorkspaceId(workspaceId!, PIPELINES_LOOKUP_PAGE),
      staleTime: 30_000,
    }),

  /** Every pipeline of a workspace, for a search: `byWorkspace` keeps a window of the list. */
  allOfWorkspace: (workspaceId: string | null) =>
    queryOptions<PaginatedList<PipelineMetadata>>({
      queryKey: WORKSPACE_PIPELINES_QUERY_KEY(workspaceId, ALL_PIPELINES),
      enabled: !!workspaceId,
      queryFn: () => repository().getMetadataByWorkspaceId(workspaceId!, ALL_PIPELINES),
      staleTime: 30_000,
    }),

  /** The document of the editor: a refetch would replace an unsaved draft. */
  byId: (pipelineId: string) =>
    queryOptions<PipelineWithLayout>({
      queryKey: PIPELINE_QUERY_KEY(pipelineId),
      enabled: !!pipelineId,
      queryFn: () => repository().getWithLayout(pipelineId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }),

  /** Opened from the editor only, behind its own route guard and its own button check. */
  fileExport: (pipelineId: string, format: PipelineFileFormat) =>
    queryOptions<PipelineFileExport>({
      queryKey: PIPELINE_EXPORT_QUERY_KEY(pipelineId, format),
      enabled: !!pipelineId,
      queryFn: () => repository().exportFile(pipelineId, format),
      staleTime: 30_000,
    }),
};

/** Read by the editor only, behind its own route guard: nothing to gate here. */
export const nodeTemplateQueries = {
  list: () =>
    queryOptions<NodeTemplateEntity[]>({
      queryKey: NODE_TEMPLATES_QUERY_KEY(),
      queryFn: () => templateRepository().list(),
      staleTime: Infinity,
    }),
};

/** A pipeline the domain refuses gets the error toast of the app, in the language of the user. */
const save = async (input: SavePipelineInput) => {
  try {
    await savePipeline().execute(input);
  } catch (error) {
    if (!(error instanceof InvalidPipelineError)) throw error;
    throw new ScyllaError(pipelineIssueText(error.issue), { code: error.code, cause: error });
  }
};

/** Needs the name too: `goToProject` writes it into the context (the breadcrumb). */
const returnToProject = () => {
  const { id, name } = currentProject();
  if (id && name) scyllaNavigate.goToProject(id, name);
};

export const pipelineMutations = {
  /**
   * With no toast: a lost place costs one position, and the Save button is for the nodes. It writes
   * the cache and does not invalidate it, because a refetch would replace an unsaved draft.
   */
  saveLayout: (pipelineId: string) =>
    mutationOptions({
      mutationFn: (layout: PipelineLayout) => repository().saveLayout(pipelineId, layout),
      onMutate: (layout: PipelineLayout) => {
        getQueryClient().setQueryData<PipelineWithLayout>(
          PIPELINE_QUERY_KEY(pipelineId),
          saved => saved && { ...saved, layout: mergeLayouts(saved.layout, layout) },
        );
      },
      meta: { showsOwnError: true },
    }),

  create: () =>
    mutationOptions({
      mutationKey: CREATE_PIPELINE_MUTATION_KEY,
      mutationFn: (pipeline: Omit<SavePipelineInput, 'id'>) => save(pipeline),
      onSuccess: (_, { projectId }) => {
        toast.success(i18n._(ToastMessages.PIPELINE_CREATE));
        void getQueryClient().invalidateQueries({
          queryKey: PROJECT_PIPELINES_QUERY_ROOT(projectId),
        });
        returnToProject();
      },
    }),

  update: () =>
    mutationOptions({
      mutationFn: (pipeline: SavePipelineInput & { id: string }) => save(pipeline),
      onSuccess: (_, { id, projectId }) => {
        const queryClient = getQueryClient();
        void queryClient.invalidateQueries({ queryKey: PROJECT_PIPELINES_QUERY_ROOT(projectId) });
        void queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEY(id) });
        toast.success(i18n._(ToastMessages.PIPELINE_UPDATE));
        returnToProject();
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (pipelineId: string) => repository().deleteById(pipelineId),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.PIPELINE_DELETE));
        void getQueryClient().invalidateQueries({ queryKey: PIPELINES_QUERY_ROOT });
      },
    }),

  /** The backend has no duplicate: read the pipeline, then create a copy of its nodes. */
  duplicate: () =>
    mutationOptions({
      mutationFn: async (pipelineId: string) => {
        const { pipeline, layout } = await repository().getWithLayout(pipelineId);

        await save({
          projectId: pipeline.projectId,
          name: i18n._(pipelineMessages.copyOf(pipeline.name)),
          nodes: pipeline.nodes,
          ...(layout && { layout }),
        });
      },
      onSuccess: () => {
        void getQueryClient().invalidateQueries({ queryKey: PIPELINES_QUERY_ROOT });
        toast.success(i18n._(ToastMessages.PIPELINE_DUPLICATE));
        returnToProject();
      },
    }),

  /** No toast here: `run-pipeline.state.svelte.ts` decides it from the agents. */
  run: () =>
    mutationOptions({
      mutationKey: RUN_PIPELINE_MUTATION_KEY,
      mutationFn: (pipelineId: string) => repository().run(pipelineId),
      onSuccess: (_data, pipelineId) => {
        void getQueryClient().invalidateQueries({ queryKey: JOBS_QUERY_KEY(pipelineId) });
      },
    }),
};
