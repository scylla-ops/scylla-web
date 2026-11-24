import { contextStore, scyllaNavigate } from '@platform/context';

const listPathOf = (pipelineId: string): string =>
  `/projects/${contextStore.getState().project.id}/pipelines/${pipelineId}/triggers`;

/** Goes to the list of the triggers of a pipeline. */
export const toList = (pipelineId: string) => scyllaNavigate.goToWorkspaceRoute(listPathOf(pipelineId));

/** Goes to the page that creates a trigger of a pipeline. */
export const toCreate = (pipelineId: string) =>
  scyllaNavigate.goToWorkspaceRoute(`${listPathOf(pipelineId)}/new`);

/** Goes to the page that edits a trigger of a pipeline. */
export const toEdit = (pipelineId: string, triggerId: string) =>
  scyllaNavigate.goToWorkspaceRoute(`${listPathOf(pipelineId)}/${encodeURIComponent(triggerId)}/edit`);

/** Goes to the repository settings of a project, where a person links a repository. */
export const toRepository = (projectId: string) =>
  scyllaNavigate.goToWorkspaceRoute(`/projects/${encodeURIComponent(projectId)}/settings/repository`);
