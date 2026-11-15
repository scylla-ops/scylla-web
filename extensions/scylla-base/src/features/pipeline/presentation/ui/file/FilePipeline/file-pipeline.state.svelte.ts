import { createQuery } from '@scylla/core-sdk';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { repositoryLinkQueries } from '@base/features/integrations';
import type { CommitRef } from '@base/features/pipeline/domain/structs/commit-ref.struct.ts';
import { blockingErrors } from '@base/features/pipeline/domain/structs/pipeline-file.struct.ts';
import * as commitRef from '@base/features/pipeline/presentation/mappers/commit-ref.mapper.ts';
import { pipelineQueries } from '@base/features/pipeline/presentation/pipeline.queries.ts';
import { shortSha } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
import { refOptions } from '@base/features/pipeline/presentation/presenters/ref-options.presenter.ts';
import type { MissingDocument } from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';

export interface FilePipelineParams {
  pipelineId: () => string;
  projectId: () => string;
}

/**
 * The page of a file pipeline: its file at a branch or a tag, and the saved pipeline, which is the
 * last valid version of the file on the default branch. The graph shows the file; when the file
 * has errors or cannot be read, it shows the saved pipeline, faded.
 */
export const createFilePipeline = (params: FilePipelineParams) => {
  const pipelineQuery = createQuery(() => pipelineQueries.byId(params.pipelineId()));
  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(params.projectId()));
  const refsQuery = createQuery(() =>
    repositoryLinkQueries.refs({ projectId: params.projectId() }),
  );

  /** `undefined`: the head of the default branch. */
  let ref = $state<CommitRef | undefined>(undefined);
  const fileQuery = createQuery(() => pipelineQueries.file(params.pipelineId(), ref));

  const link = $derived(linkQuery.data ?? null);
  const defaultBranch = $derived(link?.defaultBranch ?? '');
  const file = $derived(fileQuery.isError ? undefined : fileQuery.data);
  const errors = $derived(file ? blockingErrors(file) : []);

  /** The graph shows the saved pipeline: the file has errors, or no file came. */
  const stale = $derived(errors.length > 0 || fileQuery.isError);

  const missing = $derived<MissingDocument | undefined>(
    pipelineQuery.isLoadingError
      ? 'failed'
      : pipelineQuery.isLoading || (fileQuery.isPending && !fileQuery.isError)
        ? 'loading'
        : undefined,
  );

  const saved = $derived(pipelineQuery.data?.pipeline);
  const nodes = $derived(!stale && file ? file.nodes : (saved?.nodes ?? []));

  const branch = $derived.by(() => {
    if (!ref) return defaultBranch;
    return ref.kind === 'sha' ? shortSha(ref.sha) : ref.name;
  });

  const picked = $derived(ref ?? { kind: 'branch' as const, name: defaultBranch });

  // The default branch is a row while the refs load, so the picker shows it at once.
  const options = $derived(
    refOptions(
      refsQuery.data?.refs ??
        (defaultBranch
          ? [{ name: defaultBranch, kind: 'branch', sha: '', defaultBranch: true, webUrl: '' }]
          : []),
    ),
  );

  return {
    /** The pipeline has no file: its page is the editor. */
    get fromEditor() {
      return pipelineQuery.data?.origin.source === 'editor';
    },
    get missing() {
      return missing;
    },
    retry() {
      void pipelineQuery.refetch();
      void fileQuery.refetch();
    },
    get name() {
      return file?.name ?? saved?.name ?? '';
    },
    get savedLayout() {
      return pipelineQuery.data?.layout;
    },
    get nodes() {
      return nodes;
    },
    get stale() {
      return stale;
    },
    get link() {
      return link;
    },
    get file() {
      return file;
    },
    get errors() {
      return errors;
    },
    /** The file could not be read at this ref: none on the branch, or an error of the server. */
    get unreadable() {
      return fileQuery.isError;
    },
    get notFound() {
      return fileQuery.isError && ScyllaError.from(fileQuery.error).isNotFound();
    },
    /** The path on the default branch, for a file that did not come. */
    get path() {
      return file?.path || pipelineQuery.data?.origin.filePath || '';
    },
    get branch() {
      return branch;
    },
    get options() {
      return options;
    },
    get refsLoading() {
      return refsQuery.isPending;
    },
    get value() {
      return commitRef.toValue(picked);
    },
    pick(value: string) {
      const next = commitRef.fromValue(value);
      if (!next) return;
      const isDefault = next.kind === 'branch' && next.name === defaultBranch;
      ref = isDefault ? undefined : next;
    },
  };
};

export type FilePipeline = ReturnType<typeof createFilePipeline>;
