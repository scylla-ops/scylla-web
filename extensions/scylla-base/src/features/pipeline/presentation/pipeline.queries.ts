import { i18n } from '@lingui/core';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { scyllaNavigate, contextStore } from '@platform/context';
import { JOBS_QUERY_KEY } from '@base/features/jobs';
import type { PaginationParams, PaginatedList } from '@scylla/ui/structs';
import { toast } from '@scylla/ui/utils';
import { ScyllaError } from '@shared/utils/scylla-result.ts';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type { PipelineEntity } from '../domain/entities/pipeline.entity.ts';
import type { PipelineMetadata } from '../domain/structs/pipeline.struct.ts';
import type { PipelineIssue } from '../domain/structs/pipeline-issue.struct.ts';
import {
  InvalidPipelineError,
  type SavePipelineInput,
} from '../domain/use-cases/save-pipeline.use-case.ts';
import type { StepTemplate } from '../domain/structs/step-template.struct.ts';
import type { PipelineModule } from '../pipeline.module.ts';
import { pipelineMessages } from './messages/pipeline.messages.ts';
import {
  CREATE_PIPELINE_MUTATION_KEY,
  ORGANIZATION_PIPELINES_QUERY_KEY,
  PIPELINES_LOOKUP_PAGE,
  PIPELINES_QUERY_KEY,
  PIPELINES_QUERY_ROOT,
  PIPELINE_QUERY_KEY,
  PROJECT_PIPELINES_QUERY_ROOT,
  RUN_PIPELINE_MUTATION_KEY,
  STEP_TEMPLATES_QUERY_KEY,
} from './pipeline.query-keys.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof PipelineModule.domain>('pipeline').pipelineRepository;

const savePipeline = () => getModuleDomain<typeof PipelineModule.domain>('pipeline').savePipeline;

const templateRepository = () =>
  getModuleDomain<typeof PipelineModule.domain>('pipeline').stepTemplateRepository;

const currentProject = () => contextStore.getState().project;

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
      queryFn: async () =>
        (await repository().getMetadataByProjectId(projectId, pagination)).unwrap(),
      staleTime: 5_000,
    }),

  /** One call, scoped by the backend: nothing to gate here. */
  byOrganization: (organizationId: string | null) =>
    queryOptions<PaginatedList<PipelineMetadata>>({
      queryKey: ORGANIZATION_PIPELINES_QUERY_KEY(organizationId, PIPELINES_LOOKUP_PAGE),
      enabled: !!organizationId,
      queryFn: async () =>
        (
          await repository().getMetadataByOrganizationId(organizationId!, PIPELINES_LOOKUP_PAGE)
        ).unwrap(),
      staleTime: 30_000,
    }),

  byId: (pipelineId: string) =>
    queryOptions<PipelineEntity>({
      queryKey: PIPELINE_QUERY_KEY(pipelineId),
      enabled: !!pipelineId,
      queryFn: async () => (await repository().getById(pipelineId)).unwrap(),
      staleTime: 30_000,
    }),
};

/** Read by the editor only, behind its own route guard: nothing to gate here. */
export const stepTemplateQueries = {
  list: () =>
    queryOptions<StepTemplate[]>({
      queryKey: STEP_TEMPLATES_QUERY_KEY(),
      queryFn: async () => (await templateRepository().list()).unwrap(),
      staleTime: Infinity,
    }),
};

/** The single page, and whether it covers the whole list. */
export const asPipelineFeed = (data: PaginatedList<PipelineMetadata> | undefined) => {
  const pipelines = data?.items ?? [];
  const totalCount = data?.pagination.totalCount ?? 0;

  return {
    pipelines,
    totalCount,
    isPartialWindow: totalCount > pipelines.length,
  };
};

const issueMessage = (issue: PipelineIssue): string => {
  if (issue.kind === 'step-ids')
    return i18n._(pipelineMessages.invalidStepIds(issue.ids.join(', ')));
  return i18n._(
    issue.issue === 'empty' ? pipelineMessages.nameRequired : pipelineMessages.noSpaces,
  );
};

/** A pipeline the domain refuses gets the error toast of the app, in the language of the user. */
const save = async (input: SavePipelineInput) =>
  (await savePipeline().execute(input))
    .mapError(error =>
      error instanceof InvalidPipelineError ? new ScyllaError(issueMessage(error.issue)) : error,
    )
    .unwrap();

/** Needs the name too: `goToProject` writes it into the context (the breadcrumb). */
const returnToProject = () => {
  const { id, name } = currentProject();
  if (id && name) scyllaNavigate.goToProject(id, name);
};

export const pipelineMutations = {
  create: () =>
    mutationOptions({
      mutationKey: CREATE_PIPELINE_MUTATION_KEY,
      mutationFn: (pipeline: Omit<SavePipelineInput, 'id'>) => save(pipeline),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.PIPELINE_CREATE));
        const { id, name } = currentProject();
        if (!id || !name) return;

        void getQueryClient().invalidateQueries({ queryKey: PROJECT_PIPELINES_QUERY_ROOT(id) });
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
      mutationFn: async (pipelineId: string) =>
        (await repository().deleteById(pipelineId)).unwrap(),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.PIPELINE_DELETE));
        void getQueryClient().invalidateQueries({ queryKey: PIPELINES_QUERY_ROOT });
      },
    }),

  /** The backend has no duplicate: read the pipeline, then create a copy of its steps. */
  duplicate: () =>
    mutationOptions({
      mutationFn: async (pipelineId: string) => {
        const pipeline = (await repository().getById(pipelineId)).unwrap();

        await save({
          projectId: pipeline.projectId,
          name: i18n._(pipelineMessages.copyOf(pipeline.name)),
          steps: pipeline.steps,
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
      mutationFn: async (pipelineId: string) => (await repository().run(pipelineId)).unwrap(),
      onSuccess: (_data, pipelineId) => {
        void getQueryClient().invalidateQueries({ queryKey: JOBS_QUERY_KEY(pipelineId) });
      },
    }),
};
