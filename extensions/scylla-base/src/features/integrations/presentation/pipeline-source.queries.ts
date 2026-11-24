import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { SetPipelineSourceInput } from '../domain/entities/repository-link.entity.ts';
import type { IntegrationsModule } from '../integrations.module.ts';
import { MERGE_BLOCKS_QUERY_KEY } from './merge-block.queries.ts';
import { REPOSITORY_LINK_QUERY_KEY } from './repository-link.queries.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').pipelineSourceRepository;

/** Under the key of the link: a change of the link refreshes the files too. */
export const PIPELINE_FILES_QUERY_KEY = (projectId: string) =>
  [...REPOSITORY_LINK_QUERY_KEY(projectId), 'pipeline-files'] as const;

/**
 * Must match `PIPELINES_QUERY_ROOT` and `PIPELINE_QUERY_KEY` of `pipeline`, and
 * `TRIGGERS_QUERY_KEY` of `triggers`: not imported, to keep the graph acyclic.
 */
const PIPELINES_ROOT = ['pipelines'] as const;
const PIPELINE_ROOT = ['pipeline'] as const;
const TRIGGERS_ROOT = ['triggers'] as const;

export const pipelineSourceQueries = {
  /** The page shows a failed read in the card, not in a toast. */
  files: (projectId: string, enabled = true) =>
    queryOptions({
      queryKey: PIPELINE_FILES_QUERY_KEY(projectId),
      queryFn: () => repository().listFiles(projectId),
      enabled: enabled && !!projectId,
      staleTime: 30 * 1000,
      meta: { showsOwnError: true },
    }),
};

export const pipelineSourceMutations = {
  /**
   * A move archives or restores pipelines and stops or starts their triggers: refresh the link,
   * the merge rules, and the pipelines and triggers of the other modules. The dialog shows a
   * refusal.
   */
  set: () =>
    mutationOptions({
      mutationFn: (input: SetPipelineSourceInput) => repository().setSource(input),
      onSuccess: (_result, { projectId }) => {
        const client = getQueryClient();
        return Promise.all([
          client.invalidateQueries({ queryKey: REPOSITORY_LINK_QUERY_KEY(projectId) }),
          client.invalidateQueries({ queryKey: MERGE_BLOCKS_QUERY_KEY(projectId) }),
          client.invalidateQueries({ queryKey: PIPELINES_ROOT }),
          client.invalidateQueries({ queryKey: PIPELINE_ROOT }),
          client.invalidateQueries({ queryKey: TRIGGERS_ROOT }),
        ]);
      },
      meta: { showsOwnError: true },
    }),
};
