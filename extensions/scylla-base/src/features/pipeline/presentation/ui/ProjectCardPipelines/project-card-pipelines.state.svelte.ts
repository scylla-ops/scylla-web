import { createQuery, getQueryClient } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { PROJECT_SEARCHES_QUERY_KEY, type ProjectCardContext } from '@base/features/project';
import { cardPipelinesOf } from '../../presenters/project-card.presenter.ts';
import { pipelineQueries } from '../../pipeline.queries.ts';

/**
 * The pipelines of one project card. Each card of a batch runs the same query: one call gives
 * the pipelines of the whole batch.
 */
export const createProjectCardPipelines = (context: () => ProjectCardContext) => {
  const summaries = createQuery(() =>
    pipelineQueries.ofProjects(context().workspaceId, context().batch),
  );
  const pipelines = $derived(cardPipelinesOf(summaries.data?.items ?? [], context().projectId));

  return {
    summaries,
    get pipelines() {
      return pipelines;
    },
    /**
     * A run shows at once: on its row (the pipelines of the batch), and in the counts and the
     * health filters of the page (the searches of the projects).
     */
    async refreshAfterRun() {
      await Promise.all([
        summaries.refetch(),
        getQueryClient().invalidateQueries({
          queryKey: PROJECT_SEARCHES_QUERY_KEY(context().workspaceId),
        }),
      ]);
    },
    /** A link into the project opens it here: the store gets its name, and the pipeline's. */
    enterProject(pipeline?: { id: string; name: string }) {
      const store = contextStore.getState();
      store.setProject(context().projectId, context().projectName);
      if (pipeline) store.setPipeline(pipeline.id, pipeline.name);
    },
  };
};

export type ProjectCardPipelines = ReturnType<typeof createProjectCardPipelines>;
