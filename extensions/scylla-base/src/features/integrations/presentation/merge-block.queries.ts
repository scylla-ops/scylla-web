import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { MergeBlock, SetMergeBlockInput } from '../domain/entities/merge-block.entity.ts';
import type { IntegrationsModule } from '../integrations.module.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').mergeBlockRepository;

export const MERGE_BLOCKS_QUERY_KEY = (projectId: string) => ['merge-blocks', projectId] as const;

export const mergeBlockQueries = {
  byProject: (projectId: string, enabled = true) =>
    queryOptions({
      queryKey: MERGE_BLOCKS_QUERY_KEY(projectId),
      queryFn: () => repository().listByProject(projectId),
      enabled: enabled && !!projectId,
      staleTime: 30 * 1000,
    }),
};

export const mergeBlockMutations = {
  /** The rule of the answer replaces its row at once: the list reads the provider again, slowly. */
  set: () =>
    mutationOptions({
      mutationFn: (input: SetMergeBlockInput) => repository().set(input),
      onSuccess: block => {
        const client = getQueryClient();
        const key = MERGE_BLOCKS_QUERY_KEY(block.projectId);
        client.setQueryData<MergeBlock[]>(key, blocks =>
          blocks?.map(item => (item.pipelineId === block.pipelineId ? block : item)),
        );
        return client.invalidateQueries({ queryKey: key });
      },
    }),
};
