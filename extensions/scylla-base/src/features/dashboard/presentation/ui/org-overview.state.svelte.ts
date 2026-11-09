import {
  Permission,
  authorizationReady,
  can,
  canAccess,
  type EffectiveScope,
} from '@platform/authz';
import { contextStore } from '@platform/context';
import { createQueries, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { accessQueries, projectRef } from '@base/features/access';
import { projectQueries } from '@base/features/project';
import { asPipelineFeed, pipelineQueries, type PipelineMetadata } from '@base/features/pipeline';
import { asJobFeed, jobQueries } from '@base/features/jobs';

export type PipelineWithProject = PipelineMetadata & { projectName: string };

/** Whether the user may open the project (the project route needs the same permission). */
export type ProjectAccess = (projectId: string) => boolean;

type ScopeResult = { data?: EffectiveScope };

const OPENS = Permission.LIST_PIPELINES_BY_PROJECT;

/**
 * Projects, pipelines and recent runs of the workspace, each from the module
 * that owns it. The backend scopes the projects. The pipelines and the runs of
 * the whole workspace need their own permission: without it, the page hides them.
 */
export const createWorkspaceOverview = () => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const canListPipelines = $derived(can(Permission.LIST_PIPELINES_BY_WORKSPACE));
  const canListRuns = $derived(can(Permission.LIST_JOBS_BY_WORKSPACE));

  const projectsQuery = createQuery(() => projectQueries.lookup(workspaceId));
  const pipelinesQuery = createQuery(() => ({
    ...pipelineQueries.byWorkspace(workspaceId),
    enabled: !!workspaceId && canListPipelines,
  }));
  const jobsQuery = createQuery(() => jobQueries.byWorkspace(workspaceId, canListRuns));

  const projects = $derived(projectsQuery.data?.items ?? []);

  // `can()` knows only the active project: ask the projects that the workspace does not open.
  const unknownIds = $derived(
    authorizationReady()
      ? projects.map(project => project.id).filter(id => !can(OPENS, { projectId: id }))
      : [],
  );
  const projectScopes = createQueries(() => ({
    queries: unknownIds.map(id => accessQueries.myScope(projectRef(id))),
  }));
  const fromProjects = $derived({
    scopes: ([...projectScopes] as ScopeResult[]).flatMap(({ data }) => (data ? [data] : [])),
  });

  const pipelineFeed = $derived(asPipelineFeed(pipelinesQuery.data));
  const jobFeed = $derived(asJobFeed(jobsQuery.data));

  // The workspace listing carries `projectId` but not the project's name, so
  // the label is joined here rather than asked of the server again.
  // Rebuilt whole by the `$derived` and never mutated after it is read, so a
  // reactive collection would only make a throwaway object track dependencies.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const projectNameById = $derived(new Map(projects.map(project => [project.id, project.name])));

  const allPipelines = $derived.by((): PipelineWithProject[] =>
    pipelineFeed.pipelines.map(pipeline => ({
      ...pipeline,
      projectName: projectNameById.get(pipeline.projectId) ?? '',
    })),
  );

  return {
    get workspaceId() {
      return workspaceId;
    },
    get projects() {
      return projects;
    },
    get projectsLoading() {
      return projectsQuery.isLoading;
    },
    get projectsError() {
      return projectsQuery.isError;
    },
    get canListPipelines() {
      return canListPipelines;
    },
    get canListRuns() {
      return canListRuns;
    },
    get allPipelines() {
      return allPipelines;
    },
    get pipelinesLoading() {
      return pipelinesQuery.isLoading;
    },
    /** Counts are a floor. */
    get pipelinesTruncated() {
      return pipelineFeed.isPartialWindow;
    },
    get runs() {
      return jobFeed.summary;
    },
    get recentJobs() {
      return jobFeed.jobs;
    },
    get totalRuns() {
      return jobFeed.totalCount;
    },
    get runsLoading() {
      return jobsQuery.isLoading;
    },
    /** Say so in the UI. */
    get runsTruncated() {
      return jobFeed.isPartialWindow;
    },
    /** Reactive: a row becomes clickable once the permissions load. */
    canOpenProject: ((projectId: string) =>
      can(OPENS, { projectId }) ||
      canAccess(fromProjects, OPENS, { projectId })) satisfies ProjectAccess,
  };
};

export type WorkspaceOverview = ReturnType<typeof createWorkspaceOverview>;
