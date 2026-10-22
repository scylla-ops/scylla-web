import { createQuery } from '@scylla/core-sdk';
import { triggerQueries } from '@base/features/triggers/presentation/triggers.queries.ts';
import { triggersNavigation } from '@base/features/triggers/presentation/utils/triggers-navigation.ts';

/**
 * The page that creates a trigger of a pipeline, or edits one of them (`triggerId`). The trigger
 * comes from the list the triggers page reads: the same query, the same cache entry.
 */
export const createTriggerEditorView = (
  pipelineId: () => string,
  triggerId: () => string | undefined,
) => {
  const isEdit = $derived(triggerId() !== undefined);

  const query = createQuery(() => ({
    ...triggerQueries.byPipeline(pipelineId()),
    enabled: isEdit && pipelineId() !== '',
  }));

  const trigger = $derived.by(() => {
    const id = triggerId();
    if (id === undefined) return null;
    return (query.data ?? []).find(candidate => candidate.id === id) ?? null;
  });

  const navigation = $derived(triggersNavigation(pipelineId()));

  return {
    get isEdit() {
      return isEdit;
    },
    /** `null` when creating, and while an edited trigger loads. */
    get trigger() {
      return trigger;
    },
    get isLoading() {
      return isEdit && query.isLoading;
    },
    /** Edit asked for a trigger that is not in the pipeline. */
    get isUnavailable() {
      return isEdit && !query.isLoading && trigger === null;
    },
    leave: () => navigation.toList(),
  };
};

export type TriggerEditorView = ReturnType<typeof createTriggerEditorView>;
