import { contextStore, scyllaNavigate } from '@platform/context';

const listPathOf = (pipelineId: string): string =>
  `/projects/${contextStore.getState().project.id}/pipelines/${pipelineId}/triggers`;

/** The pages of the triggers of a pipeline: its list and the editor. */
export const triggersNavigation = (pipelineId: string) => ({
  toList: () => scyllaNavigate.goToOrgRoute(listPathOf(pipelineId)),
  toCreate: () => scyllaNavigate.goToOrgRoute(`${listPathOf(pipelineId)}/new`),
  toEdit: (triggerId: string) =>
    scyllaNavigate.goToOrgRoute(`${listPathOf(pipelineId)}/${encodeURIComponent(triggerId)}/edit`),
});
