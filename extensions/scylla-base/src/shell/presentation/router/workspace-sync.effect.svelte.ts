import { untrack } from 'svelte';
import { navigateTo, contextStore, workspaceUrl } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { workspaceQueries } from '@base/features/workspace';

/** When no workspace matches the slug, goes to the projects of the first workspace. */
export const syncWorkspace = (workspaceSlug: string | undefined): void => {
  const workspaces = createQuery(() => workspaceQueries.mine());

  $effect(() => {
    const list = workspaces.data;
    if (!workspaceSlug || workspaces.isLoading || !list) return;

    untrack(() => {
      const store = contextStore.getState();
      const match = list.find(workspace => workspace.slug === workspaceSlug);

      if (match) {
        const { workspace } = store;
        if (match.id !== workspace.id || match.slug !== workspace.slug)
          store.setWorkspace(match.id, match.name, match.slug);
        return;
      }

      const fallback = list[0];
      if (!fallback) return;

      navigateTo(workspaceUrl(fallback.slug), { replace: true });
      store.setWorkspace(fallback.id, fallback.name, fallback.slug);
    });
  });
};
