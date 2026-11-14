import { createQuery } from '@scylla/core-sdk';
import { repositoryLinkQueries } from '@base/features/integrations';
import {
  commitShaIssue,
  type CommitRef,
  type CommitShaIssue,
} from '@base/features/pipeline/domain/structs/commit-ref.struct.ts';
import * as commitRef from '@base/features/pipeline/presentation/mappers/commit-ref.mapper.ts';
import {
  SHA_OPTION,
  runTargetOptions,
} from '@base/features/pipeline/presentation/presenters/ref-options.presenter.ts';

export interface RunTargetParams {
  projectId: () => string;
  /** Chosen until the user picks another row. */
  defaultBranch: () => string;
}

/** The commit that the Run dialog sends: a branch or a tag of the list, or a typed SHA. */
export const createRunTarget = (params: RunTargetParams) => {
  const refsQuery = createQuery(() =>
    repositoryLinkQueries.refs({ projectId: params.projectId() }),
  );

  let picked = $state<string | null>(null);
  let sha = $state('');

  // Until the refs come, the default branch is a row of its own: the field shows it at once.
  const options = $derived(
    runTargetOptions(
      refsQuery.data?.refs ?? [
        { name: params.defaultBranch(), kind: 'branch', sha: '', defaultBranch: true, webUrl: '' },
      ],
    ),
  );
  const value = $derived(
    picked ?? commitRef.toValue({ kind: 'branch', name: params.defaultBranch() }),
  );
  const usesSha = $derived(value === SHA_OPTION);
  const shaIssue = $derived<CommitShaIssue | null>(usesSha ? commitShaIssue(sha) : null);
  const ref = $derived<CommitRef | undefined>(
    usesSha
      ? shaIssue
        ? undefined
        : { kind: 'sha', sha: sha.trim() }
      : commitRef.fromValue(value),
  );

  return {
    get options() {
      return options;
    },
    get loading() {
      return refsQuery.isPending;
    },
    get value() {
      return value;
    },
    pick(next: string) {
      picked = next;
    },
    get usesSha() {
      return usesSha;
    },
    get sha() {
      return sha;
    },
    setSha(next: string) {
      sha = next;
    },
    get shaIssue() {
      return shaIssue;
    },
    /** `undefined`: nothing to run yet. */
    get ref() {
      return ref;
    },
  };
};

export type RunTarget = ReturnType<typeof createRunTarget>;
