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
import { canListProjects, projectQueries } from '@base/features/project';

const isPipelinePath = (pathname: string): boolean =>
  pathname.includes('/edit/') || pathname.includes('/pipelines/');

/**
 * Keeps the store on the project of the URL, with the name of the server. Leaves a project that no
 * longer exists, and clears the pipeline outside the pipeline pages. `gone`: do not show the page.
 */
export const cleanContext = (projectId: string | undefined): { readonly gone: boolean } => {
  const pathname = currentPathname();
  const { workspaceSlug } = routeParams();
  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);
  const read = createQuery(() => projectQueries.byId(projectId));

  /** `undefined`: no answer yet, or a refusal that proves nothing. `null`: the project is gone. */
  const project = $derived.by(() => {
    const answer = read.data;
    // `syncWorkspace` writes the workspace of the URL after this effect runs for the first time.
    if (answer === undefined || (workspaceSlug && workspace.slug !== workspaceSlug))
      return undefined;
    // One answer for a refusal and an unknown id: only a reader of the workspace list can tell.
    if (answer === null) return canListProjects(workspace.id) ? null : undefined;
    return answer.workspaceId === workspace.id ? answer : null;
  });

  $effect(() => {
    const current = project;
    if (current === undefined) return;

    untrack(() => {
      // During the exit animation this wrapper stays mounted: only the new one can write.
      if (routeParams().projectId !== projectId) return;

      const store = contextStore.getState();

      if (!current) {
        store.setProject(null, null);
        store.setPipeline(null, null);
        const slug = activeWorkspaceSlug();
        navigateTo(slug ? workspaceUrl(slug) : '/', { replace: true });
        return;
      }

      if (store.project.id !== current.id || store.project.name !== current.name)
        store.setProject(current.id, current.name);
      if (store.pipeline.id && !isPipelinePath(pathname)) store.setPipeline(null, null);
    });
  });

  return {
    get gone() {
      return project === null;
    },
  };
};
