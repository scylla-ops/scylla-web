import { createMutation, createQuery } from '@scylla/core-sdk';
import { Permission, can } from '@platform/authz';
import { createSearchParams } from '@platform/context';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { repositoryLinkQueries } from '@base/features/integrations';
import type { CommitRef } from '@base/features/pipeline/domain/structs/commit-ref.struct.ts';
import { blockingErrors } from '@base/features/pipeline/domain/structs/pipeline-file.struct.ts';
import * as commitRef from '@base/features/pipeline/presentation/mappers/commit-ref.mapper.ts';
import {
  pipelineMutations,
  pipelineQueries,
} from '@base/features/pipeline/presentation/pipeline.queries.ts';
import { shortSha } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
import { refOptions } from '@base/features/pipeline/presentation/presenters/ref-options.presenter.ts';
import { createNodePlaces } from '@base/features/pipeline/presentation/ui/editor/blueprint/node-places.state.svelte.ts';
import type { MissingDocument } from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';

export interface FilePipelineParams {
  pipelineId: () => string;
  projectId: () => string;
}

/** The tabs of the page. The first one is the default, which the URL does not name. */
const FILE_TABS = ['blueprint', 'scripting'] as const;
export type FileTab = (typeof FILE_TABS)[number];

/**
 * The page of a file pipeline: its file at a branch or a tag, and the saved pipeline, which is the
 * last valid version of the file on the default branch. The graph shows the file; when the file
 * has errors or cannot be read, it shows the saved pipeline, faded. The ref and the tab are in the
 * URL (`?ref=branch:dev&tab=scripting`), so that a copied link opens the same view. The places of
 * the nodes are not part of the file: a reader who can change the pipeline moves them, and the
 * server keeps them.
 */
export const createFilePipeline = (params: FilePipelineParams) => {
  const pipelineQuery = createQuery(() => pipelineQueries.byId(params.pipelineId()));
  const linkQuery = createQuery(() => repositoryLinkQueries.byProject(params.projectId()));
  const refsQuery = createQuery(() =>
    repositoryLinkQueries.refs({ projectId: params.projectId() }),
  );

  const search = createSearchParams(['ref', 'tab']);

  /** `undefined`: the head of the default branch. */
  const ref = $derived<CommitRef | undefined>(commitRef.fromValue(search.values.ref));
  const tab = $derived<FileTab>(
    FILE_TABS.find(known => known === search.values.tab) ?? 'blueprint',
  );
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

  const saveLayout = createMutation(() => pipelineMutations.saveLayout(params.pipelineId()));
  // The server checks the places as a change of the pipeline (`save_pipeline_layout = edit`).
  const canArrange = $derived(can(Permission.UPDATE_PIPELINE, { projectId: params.projectId() }));
  // The ids of the saved pipeline: the server ignores the place of a node that it does not hold.
  const places = createNodePlaces({
    savedIds: () => saved?.nodes.map(node => node.id) ?? [],
    save: layout => {
      if (canArrange) saveLayout.mutate(layout);
    },
  });

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
    /** Where a move of a node goes. A reader who cannot change the pipeline moves it for the visit only. */
    places,
    get canArrange() {
      return canArrange;
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
      search.write({ ref: isDefault ? '' : commitRef.toValue(next) });
    },
    get tab() {
      return tab;
    },
    selectTab(next: string) {
      search.write({ tab: next === FILE_TABS[0] ? '' : next });
    },
  };
};

export type FilePipeline = ReturnType<typeof createFilePipeline>;
