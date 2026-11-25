import { createQuery } from '@scylla/core-sdk';
import { createSearchParams } from '@platform/context';
import { repositoryLinkQueries, type RepositoryLink } from '@base/features/integrations';
import { createGitEvents } from '@base/features/pipeline';
import { triggerQueries } from '@base/features/triggers/presentation/triggers.queries.ts';
import * as triggersNavigation from '@base/features/triggers/presentation/mappers/triggers-navigation.mapper.ts';
import { createPipelineOrigin } from '../../../pipeline-origin.state.svelte.ts';

/**
 * The page that creates a trigger of a pipeline, or edits one of them (`triggerId`). The trigger
 * comes from the list the triggers page reads: the same query, the same cache entry. The link of
 * the project tells if the Git kinds are possible, and on which provider. `?kind=webhook` picks the
 * kind of a new trigger in advance.
 */
export const createTriggerEditorView = (
  projectId: () => string,
  pipelineId: () => string,
  triggerId: () => string | undefined,
) => {
  const isEdit = $derived(triggerId() !== undefined);

  const query = createQuery(() => ({
    ...triggerQueries.byPipeline(pipelineId()),
    enabled: isEdit && pipelineId() !== '',
  }));

  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(projectId()));
  const origin = createPipelineOrigin(pipelineId);
  const search = createSearchParams(['kind']);
  const gitEvents = createGitEvents({ projectId, pipelineId });

  const trigger = $derived.by(() => {
    const id = triggerId();
    if (id === undefined) return null;
    return (query.data ?? []).find(candidate => candidate.id === id) ?? null;
  });

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
    /** A trigger of the `on` table of a pipeline file: only the file changes it. */
    get isFromFile() {
      return trigger?.fromFile === true;
    },
    /** `null` with no link; absent while it loads, or without the right to read it. */
    get link(): RepositoryLink | null | undefined {
      return linkQuery.data;
    },
    get isFilePipeline() {
      return origin.isFile;
    },
    /** The kind of a new trigger, from the URL. None: the form picks a schedule. */
    get initialKind() {
      return triggersNavigation.kindFromSearch(search.values.kind);
    },
    /** The opt-in of an admin for the Git kinds of an editor pipeline in a project of files. */
    gitEvents,
    leave: () => triggersNavigation.toList(pipelineId()),
    toRepository: () => triggersNavigation.toRepository(projectId()),
  };
};

export type TriggerEditorView = ReturnType<typeof createTriggerEditorView>;
