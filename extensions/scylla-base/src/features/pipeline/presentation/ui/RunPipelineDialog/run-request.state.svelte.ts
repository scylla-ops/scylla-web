import { createQuery } from '@scylla/core-sdk';
import { repositoryLinkQueries, type RepositoryLink } from '@base/features/integrations';
import type { PipelineIdentity } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import type { CommitRef } from '@base/features/pipeline/domain/structs/commit-ref.struct.ts';
import type { RunPipeline } from '../run-pipeline.state.svelte.ts';

export type RunRequestPipeline = Pick<PipelineIdentity, 'id' | 'name'>;

export interface RunRequestParams {
  projectId: () => string;
  runPipeline: RunPipeline;
}

/**
 * The Run action of a project page. With a linked repository, it asks which commit to run;
 * without one, or while the link loads, it runs at once, as before the integration.
 */
export const createRunRequest = (params: RunRequestParams) => {
  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(params.projectId()));

  let open = $state(false);
  // Kept while the dialog closes: its title does not change during the animation.
  let asked = $state<RunRequestPipeline | null>(null);

  const link = $derived<RepositoryLink | null>(linkQuery.data ?? null);

  return {
    get link() {
      return link;
    },
    get open() {
      return open;
    },
    get asked() {
      return asked;
    },

    async start(pipeline: RunRequestPipeline): Promise<void> {
      if (!link) return params.runPipeline.run(pipeline.id);
      asked = pipeline;
      open = true;
    },

    close() {
      open = false;
    },

    async confirm(ref: CommitRef): Promise<void> {
      open = false;
      if (asked) await params.runPipeline.run(asked.id, ref);
    },
  };
};

export type RunRequest = ReturnType<typeof createRunRequest>;
