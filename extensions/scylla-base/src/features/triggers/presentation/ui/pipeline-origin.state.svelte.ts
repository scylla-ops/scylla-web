import { can, Permission } from '@platform/authz';
import { createQuery } from '@scylla/core-sdk';
import { pipelineQueries } from '@base/features/pipeline';

/**
 * Where the pipeline of the triggers comes from. A file pipeline takes its Git triggers from the
 * `on` table of its file, and the list names that file. The same cache entry as the editor of the
 * pipeline.
 */
export const createPipelineOrigin = (pipelineId: () => string) => {
  const query = createQuery(() => ({
    ...pipelineQueries.byId(pipelineId()),
    enabled: !!pipelineId() && can(Permission.READ_PIPELINE),
  }));

  return {
    get isFile() {
      return query.data?.origin.source === 'file';
    },
    /** For example `.scylla/pipelines/build.toml`. Empty while unknown, and for an editor pipeline. */
    get filePath() {
      return query.data?.origin.filePath ?? '';
    },
  };
};
