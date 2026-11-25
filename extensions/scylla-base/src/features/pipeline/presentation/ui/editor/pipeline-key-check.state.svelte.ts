import { createQuery } from '@scylla/core-sdk';
import { repositoryLinkQueries } from '@base/features/integrations';
import { fileWithKeyOf } from '@base/features/pipeline/domain/structs/pipeline-key.struct.ts';
import { pipelineQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
import { pipelineKeyTakenText } from '@base/features/pipeline/presentation/presenters/pipeline-issue.presenter.ts';

interface PipelineKeyCheckOptions {
  projectId: () => string;
  /** The saved name of an edited pipeline: its own key stays free. Absent for a new pipeline. */
  savedName: () => string | undefined;
}

/**
 * Checks the name of an editor pipeline against the keys of the pipeline files, in a project of
 * files: a file and an editor pipeline cannot have one key. The server stays the judge: while the
 * link or the keys are not known, no name is taken.
 */
export const createPipelineKeyCheck = (options: PipelineKeyCheckOptions) => {
  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(options.projectId()));
  const usesFiles = $derived(linkQuery.data?.pipelineSource === 'file');
  const keysQuery = createQuery(() => pipelineQueries.fileKeys(options.projectId(), usesFiles));

  return {
    /** Why the name cannot be saved: a file has its key. `null` when the key is free. */
    issueOf(name: string): string | null {
      if (!usesFiles || !keysQuery.data) return null;
      const file = fileWithKeyOf(name, keysQuery.data, options.savedName());
      return file ? pipelineKeyTakenText(file) : null;
    },
  };
};

export type PipelineKeyCheck = ReturnType<typeof createPipelineKeyCheck>;
