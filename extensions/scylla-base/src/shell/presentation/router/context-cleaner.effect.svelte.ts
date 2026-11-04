import { untrack } from 'svelte';
import {
  activeWorkspaceSlug,
  currentPathname,
  navigateTo,
  contextStore,
  workspaceUrl,
} from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { projectQueries } from '@base/features/project';

const isPipelinePath = (pathname: string): boolean =>
  pathname.includes('/edit/') || pathname.includes('/pipelines/');

/** Leaves a project that no longer exists, and clears the pipeline outside the pipeline pages. */
export const cleanContext = (projectId: string | undefined): void => {
  const pathname = currentPathname();
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const projects = createQuery(() => projectQueries.byWorkspace(workspaceId));

  $effect(() => {
    const list = projects.data?.items;
    if (projects.isLoading || !list || !projectId) return;

    untrack(() => {
      const store = contextStore.getState();

      if (!list.some(project => project.id === projectId)) {
        store.setProject(null, null);
        store.setPipeline(null, null);
        const slug = activeWorkspaceSlug();
        navigateTo(slug ? workspaceUrl(slug) : '/', { replace: true });
        return;
      }

      if (store.pipeline.id && !isPipelinePath(pathname)) store.setPipeline(null, null);
    });
  });
};
