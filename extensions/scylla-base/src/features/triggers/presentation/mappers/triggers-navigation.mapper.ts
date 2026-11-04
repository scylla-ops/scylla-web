import { contextStore, scyllaNavigate } from '@platform/context';

const listPathOf = (pipelineId: string): string =>
  `/projects/${contextStore.getState().project.id}/pipelines/${pipelineId}/triggers`;

/** Goes to the list of the triggers of a pipeline. */
export const toList = (pipelineId: string) => scyllaNavigate.goToOrgRoute(listPathOf(pipelineId));

/** Goes to the page that creates a trigger of a pipeline. */
export const toCreate = (pipelineId: string) =>
  scyllaNavigate.goToOrgRoute(`${listPathOf(pipelineId)}/new`);

/** Goes to the page that edits a trigger of a pipeline. */
export const toEdit = (pipelineId: string, triggerId: string) =>
  scyllaNavigate.goToOrgRoute(`${listPathOf(pipelineId)}/${encodeURIComponent(triggerId)}/edit`);
