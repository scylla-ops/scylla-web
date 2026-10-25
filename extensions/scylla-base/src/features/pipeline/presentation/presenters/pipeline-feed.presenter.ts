import type { PaginatedList } from '@scylla/ui/structs';
import type { PipelineMetadata } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

/** The single page, and whether it covers the whole list. */
export const asPipelineFeed = (data: PaginatedList<PipelineMetadata> | undefined) => {
  const pipelines = data?.items ?? [];
  const totalCount = data?.pagination.totalCount ?? 0;

  return {
    pipelines,
    totalCount,
    isPartialWindow: totalCount > pipelines.length,
  };
};
