import { contextStore, scyllaNavigate } from '@platform/context';
import {
  GIT_KINDS,
  type TriggerDraftKind,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';

const DRAFT_KINDS: readonly TriggerDraftKind[] = ['cron', 'webhook', ...GIT_KINDS];

const listPathOf = (pipelineId: string): string =>
  `/projects/${contextStore.getState().project.id}/pipelines/${pipelineId}/triggers`;

/** Goes to the list of the triggers of a pipeline. */
export const toList = (pipelineId: string) => scyllaNavigate.goToWorkspaceRoute(listPathOf(pipelineId));

/** Goes to the page that creates a trigger of a pipeline, with a kind picked in advance. */
export const toCreate = (pipelineId: string, kind?: TriggerDraftKind) =>
  scyllaNavigate.goToWorkspaceRoute(`${listPathOf(pipelineId)}/new${kind ? `?kind=${kind}` : ''}`);

/** The kind of the `kind` parameter of the create page. Another value: none. */
export const kindFromSearch = (value: string): TriggerDraftKind | undefined =>
  DRAFT_KINDS.find(kind => kind === value);

/** Goes to the page that edits a trigger of a pipeline. */
export const toEdit = (pipelineId: string, triggerId: string) =>
  scyllaNavigate.goToWorkspaceRoute(`${listPathOf(pipelineId)}/${encodeURIComponent(triggerId)}/edit`);

/** Goes to the repository settings of a project, where a person links a repository. */
export const toRepository = (projectId: string) =>
  scyllaNavigate.goToWorkspaceRoute(`/projects/${encodeURIComponent(projectId)}/settings/repository`);
