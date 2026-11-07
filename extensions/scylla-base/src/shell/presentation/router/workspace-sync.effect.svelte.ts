import { untrack } from 'svelte';
import {
  currentPathname,
  currentSearch,
  navigateTo,
  contextStore,
  workspaceUrl,
} from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { workspaceQueries } from '@base/features/workspace';
import { rememberWorkspace } from './last-workspace.ts';

const samePageAt = (oldSlug: string, newSlug: string): string =>
  `/${newSlug}${currentPathname().slice(oldSlug.length + 1)}${currentSearch()}`;

/**
 * Keeps the store equal to the list of the server, also when the list changes after the mount: a
 * rename reaches each reader of the store here. When no workspace matches the slug, goes to the
 * same page under the new slug of the active workspace, else to the first workspace.
 */
export const syncWorkspace = (workspaceSlug: string | undefined): void => {
  const workspaces = createQuery(() => workspaceQueries.mine());

  $effect(() => {
    const list = workspaces.data;
    if (!workspaceSlug || workspaces.isLoading || !list) return;

    untrack(() => {
      const store = contextStore.getState();
      const { workspace } = store;
      const match = list.find(item => item.slug === workspaceSlug);

      if (match) {
        rememberWorkspace(match.id);
        if (match.id !== workspace.id) store.setWorkspace(match.id, match.name, match.slug);
        else if (match.name !== workspace.name || match.slug !== workspace.slug)
          store.renameWorkspace(match.name, match.slug);
        return;
      }

      const renamed =
        workspace.slug === workspaceSlug ? list.find(item => item.id === workspace.id) : undefined;
      if (renamed) {
        store.renameWorkspace(renamed.name, renamed.slug);
        navigateTo(samePageAt(workspaceSlug, renamed.slug), { replace: true });
        return;
      }

      const fallback = list[0];
      if (!fallback) return;

      navigateTo(workspaceUrl(fallback.slug), { replace: true });
      store.setWorkspace(fallback.id, fallback.name, fallback.slug);
    });
  });
};
