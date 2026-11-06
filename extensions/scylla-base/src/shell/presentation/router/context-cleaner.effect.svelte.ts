import { untrack } from 'svelte';
import {
  activeWorkspaceSlug,
  currentPathname,
  navigateTo,
  contextStore,
  workspaceUrl,
} from '@platform/context';
import { createQuery, routeParams } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { projectQueries } from '@base/features/project';

const isPipelinePath = (pathname: string): boolean =>
  pathname.includes('/edit/') || pathname.includes('/pipelines/');

/**
 * Keeps the store on the project of the URL, with the name of the server. Leaves a project that no
 * longer exists, and clears the pipeline outside the pipeline pages.
 */
export const cleanContext = (projectId: string | undefined): void => {
  const pathname = currentPathname();
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const projects = createQuery(() => projectQueries.byWorkspace(workspaceId));

  $effect(() => {
    const list = projects.data?.items;
    if (projects.isLoading || !list || !projectId) return;

    untrack(() => {
      // During the exit animation this wrapper stays mounted: only the new one can write.
      if (routeParams().projectId !== projectId) return;

      const store = contextStore.getState();
      const match = list.find(project => project.id === projectId);

      if (!match) {
        store.setProject(null, null);
        store.setPipeline(null, null);
        const slug = activeWorkspaceSlug();
        navigateTo(slug ? workspaceUrl(slug) : '/', { replace: true });
        return;
      }

      if (store.project.id !== match.id || store.project.name !== match.name)
        store.setProject(match.id, match.name);
      if (store.pipeline.id && !isPipelinePath(pathname)) store.setPipeline(null, null);
    });
  });
};
