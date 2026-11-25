import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { Permission, can } from '@platform/authz';
import { contextStore } from '@platform/context';
import { userQueries } from '@base/features/user';
import {
  defaultValues,
  latestVersion,
  missingParameters,
  type FragmentAuthor,
  type FragmentEntity,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import { fragmentQueries } from '@base/features/pipeline/presentation/fragment.queries.ts';
import type { Blueprint, NodePlacement } from './blueprint.state.svelte.ts';

const context = toRune(contextStore);

/**
 * The library as the editor sees it: the fragments of the workspace for the palette and the
 * blocks, and who saves a new one.
 */
export const createEditorLibrary = (blueprint: Blueprint) => {
  const workspace = $derived(context().workspace);
  const fragmentsQuery = createQuery(() => fragmentQueries.list(workspace.id));
  const meQuery = createQuery(() => userQueries.me());

  const fragments = $derived(fragmentsQuery.data ?? []);

  return {
    get fragments() {
      return fragments;
    },
    get workspaceId() {
      return workspace.id;
    },
    get workspaceName() {
      return workspace.name ?? '';
    },
    /** `undefined` until the account is known: nothing can be saved before. */
    get author(): FragmentAuthor | undefined {
      const me = meQuery.data;
      return me && { id: me.id, name: me.displayName || me.username };
    },
    get admin() {
      return can(Permission.UPDATE_WORKSPACE);
    },

    fragmentOf: (fragmentId: string) => fragments.find(fragment => fragment.id === fragmentId),

    /**
     * Adds a block of the latest version. A block that still needs a value opens in the side
     * panel: the user fills it at once, else the pipeline cannot run.
     */
    add(fragment: FragmentEntity, placement?: NodePlacement): string {
      const version = latestVersion(fragment);
      const values = defaultValues(version.parameters);
      const blockId = blueprint.addBlock({ fragment, version, values }, placement);
      if (missingParameters(version.parameters, values).length) blueprint.inspect(blockId);
      return blockId;
    },
  };
};

export type EditorLibrary = ReturnType<typeof createEditorLibrary>;
