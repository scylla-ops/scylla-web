import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { Permission, can } from '@platform/authz';
import { contextStore, scyllaNavigate } from '@platform/context';
import { userQueries } from '@base/features/user';
import {
  canPublishVersion,
  latestVersion,
  type FragmentAuthor,
  type FragmentEntity,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import {
  canDecideUpstream,
  pendingUpstream,
} from '@base/features/pipeline/domain/structs/fragment-upstream.struct.ts';
import { canPublishToMarketplace } from '@base/features/pipeline/domain/structs/fragment-publication.struct.ts';
import { fragmentMutations, fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';

const context = toRune(contextStore);

/** Two versions side by side: the library and the publisher, or two of the library. */
export interface Comparison {
  from: { label: string; version: FragmentEntity['versions'][number] };
  to: { label: string; version: FragmentEntity['versions'][number] };
}

/** Why the pipeline picker opens: to drop the fragment, or to save its next version. */
export type PickerIntent = 'use' | 'publish';

/**
 * The page of a fragment: what the person may do on it, the decisions on the versions of its
 * publisher, and the dialogs it opens.
 */
export const createFragmentDetail = (fragmentId: () => string) => {
  const workspace = $derived(context().workspace);
  const fragmentQuery = createQuery(() => fragmentQueries.byId(workspace.id, fragmentId()));
  const meQuery = createQuery(() => userQueries.me());

  const accept = createMutation(() => fragmentMutations.acceptUpstream());
  const skip = createMutation(() => fragmentMutations.skipUpstream());
  const dismiss = createMutation(() => fragmentMutations.dismissUpstream());
  const detach = createMutation(() => fragmentMutations.detachAsFork());
  const fork = createMutation(() => fragmentMutations.addFromMarketplace());
  const deprecate = createMutation(() => fragmentMutations.deprecateVersion());

  const fragment = $derived(fragmentQuery.data);
  const me = $derived<FragmentAuthor | undefined>(
    meQuery.data && { id: meQuery.data.id, name: meQuery.data.displayName || meQuery.data.username },
  );
  const person = $derived({ id: me?.id ?? '', admin: can(Permission.UPDATE_WORKSPACE) });
  const pending = $derived(fragment ? pendingUpstream(fragment) : null);

  let publishing = $state<number | null>(null);
  let comparison = $state<Comparison | null>(null);
  let picker = $state<PickerIntent | null>(null);

  return {
    get query() {
      return fragmentQuery;
    },
    get fragment() {
      return fragment;
    },
    get workspaceName() {
      return workspace.name ?? '';
    },
    /** The scope of the public names of the workspace. */
    get scope() {
      return workspace.slug ?? '';
    },
    get me() {
      return me;
    },
    get pending() {
      return pending;
    },
    get canPublishVersion() {
      return !!fragment && !!me && canPublishVersion(fragment, person);
    },
    get canPublishToMarketplace() {
      return !!fragment && !!me && canPublishToMarketplace(fragment, person);
    },
    get canDecideUpstream() {
      return canDecideUpstream(person);
    },
    get busy() {
      return accept.isPending || skip.isPending || dismiss.isPending || detach.isPending || fork.isPending;
    },

    /** The version that the publish dialog makes public. `null`: the dialog is closed. */
    get publishing() {
      return publishing;
    },
    set publishing(next: number | null) {
      publishing = next;
    },
    get comparison() {
      return comparison;
    },
    set comparison(next: Comparison | null) {
      comparison = next;
    },
    get picker() {
      return picker;
    },
    set picker(next: PickerIntent | null) {
      picker = next;
    },

    accept(version: number) {
      if (fragment) accept.mutate({ id: fragment.id, version });
    },
    skip(version: number) {
      if (fragment) skip.mutate({ id: fragment.id, version });
    },
    dismiss() {
      if (fragment) dismiss.mutate(fragment.id);
    },
    detach() {
      if (fragment) detach.mutate(fragment.id);
    },
    deprecate(version: number) {
      if (fragment) deprecate.mutate({ id: fragment.id, version });
    },

    /** A new fork from the release of the publisher, beside this one: its page opens. */
    forkUpstream() {
      if (!fragment?.source || !pending || !me) return;
      fork.mutate(
        {
          workspaceId: fragment.workspaceId,
          mode: 'forked',
          name: `${fragment.name}-v${pending.number}`,
          description: fragment.description,
          tags: fragment.tags,
          package: fragment.source.package,
          version: pending,
          newer: [],
          author: me,
        },
        { onSuccess: created => scyllaNavigate.goToWorkspaceRoute(`library/${created.id}`) },
      );
    },

    /** The latest version of the library beside the release of the publisher. */
    compareUpstream(fromLabel: string, toLabel: string) {
      if (!fragment || !pending) return;
      comparison = {
        from: { label: fromLabel, version: latestVersion(fragment) },
        to: { label: toLabel, version: pending },
      };
    },
  };
};

export type FragmentDetail = ReturnType<typeof createFragmentDetail>;
