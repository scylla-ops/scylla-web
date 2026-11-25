import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { repositoryLinkQueries } from '@base/features/integrations';
import { createGitEvents, type PipelineStartPanelContext } from '@base/features/pipeline';
import {
  GIT_KINDS,
  isGitSource,
  type TriggerDraftKind,
  type TriggerEntity,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import * as triggersNavigation from '@base/features/triggers/presentation/mappers/triggers-navigation.mapper.ts';
import { triggersMessages } from '@base/features/triggers/presentation/messages/triggers.messages.ts';
import {
  addableKinds,
  triggerGroups,
} from '@base/features/triggers/presentation/presenters/trigger-panel.presenter.ts';
import {
  triggerMutations,
  triggerQueries,
} from '@base/features/triggers/presentation/triggers.queries.ts';
import { createPipelineOrigin } from '@base/features/triggers/presentation/ui/pipeline-origin.state.svelte.ts';

/**
 * The triggers of a pipeline in the panel of its start node: the ones of the `on` table of its
 * file, read only, then the ones that Scylla keeps, with a switch, Edit and Delete. A new schedule
 * is a short form in the panel; another kind, and the inputs, open the full editor. The same
 * queries as the triggers page: one cache entry.
 */
export const createPipelineTriggersPanel = (context: () => PipelineStartPanelContext) => {
  const pipelineId = () => context().pipelineId;

  const query = createQuery(() => triggerQueries.byPipeline(pipelineId()));
  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(context().projectId));
  const origin = createPipelineOrigin(pipelineId);
  // The opt-in lives in the cache of the pipeline: the triggers page and the type picker read the same.
  const gitEvents = createGitEvents({ projectId: () => context().projectId, pipelineId });
  const setEnabled = createMutation(() => triggerMutations.setEnabled(pipelineId()));
  const remove = createMutation(() => triggerMutations.remove(pipelineId()));

  let adding = $state(false);
  let deleting = $state<TriggerEntity | null>(null);

  const triggers = $derived(query.data ?? []);
  const groups = $derived(triggerGroups(triggers));

  return {
    get isLoading() {
      return query.isLoading;
    },
    /** The first load failed. A failed refetch keeps the rows. */
    get loadError(): string | null {
      if (!query.isLoadingError) return null;
      return query.error instanceof ScyllaError
        ? query.error.userMessage()
        : t(triggersMessages.loadError);
    },
    get triggers() {
      return triggers;
    },
    get fromFile() {
      return groups.fromFile;
    },
    get stored() {
      return groups.stored;
    },
    get isFile() {
      return origin.isFile;
    },
    /** GitLab names a pull request "merge request". */
    get provider() {
      return linkQuery.data?.provider;
    },
    get kinds() {
      return addableKinds(origin.isFile, linkQuery.data);
    },
    get gitEvents() {
      return gitEvents;
    },
    /** The Git kinds wait for the opt-in of an admin: the menu disables them. */
    get gitOff(): boolean {
      return gitEvents.needed && !gitEvents.allowed;
    },
    isGitKind(kind: TriggerDraftKind) {
      return (GIT_KINDS as readonly string[]).includes(kind);
    },
    /** The note shows while the opt-in is on, so that an admin can revoke it, or a Git row waits for it. */
    get showGitNote(): boolean {
      return (
        gitEvents.needed && (gitEvents.allowed || triggers.some(row => isGitSource(row.source)))
      );
    },
    /** The short form of a new schedule is open. */
    get adding() {
      return adding;
    },
    add(kind: TriggerDraftKind) {
      if (kind === 'cron') adding = true;
      else triggersNavigation.toCreate(pipelineId(), kind);
    },
    closeForm() {
      adding = false;
    },
    toFullEditor() {
      triggersNavigation.toCreate(pipelineId(), 'cron');
    },
    toList() {
      triggersNavigation.toList(pipelineId());
    },
    setEnabled(trigger: TriggerEntity, enabled: boolean) {
      setEnabled.mutate({ triggerId: trigger.id, enabled });
    },
    edit(trigger: TriggerEntity) {
      triggersNavigation.toEdit(pipelineId(), trigger.id);
    },
    /** The trigger that the confirmation of a delete names. */
    get deleting() {
      return deleting;
    },
    askDelete(trigger: TriggerEntity) {
      deleting = trigger;
    },
    cancelDelete() {
      deleting = null;
    },
    confirmDelete() {
      if (deleting) remove.mutate(deleting.id);
      deleting = null;
    },
  };
};

export type PipelineTriggersPanel = ReturnType<typeof createPipelineTriggersPanel>;
