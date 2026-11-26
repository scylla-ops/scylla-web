import { untrack } from 'svelte';
import { currentPathname, contextStore } from '@platform/context';
import { Permission, can } from '@platform/authz';
import { createQuery, routeParams } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import { pipelineQueries } from '@base/features/pipeline';
import { canListProjects, projectQueries } from '@base/features/project';
import { isId } from '@shared/utils/id.ts';
import { goneProject } from './gone-project.state.svelte.ts';

const isPipelinePath = (pathname: string): boolean =>
  pathname.includes('/edit/') || pathname.includes('/pipelines/');

/**
 * Keeps the store on the project of the URL, with the name of the server. Clears a project that no
 * longer exists, and the pipeline outside the pipeline pages. `gone`: show the not-found page, not
 * the page.
 */
export const cleanContext = (projectId: string | undefined): { readonly gone: boolean } => {
  const pathname = currentPathname();
  const { workspaceSlug } = routeParams();
  const context = toRune(contextStore);
  const workspace = $derived(context().workspace);
  // A text that is not an id names no project: no request, which would fail with a server message.
  const wellFormed = isId(projectId);
  const read = createQuery(() => ({ ...projectQueries.byId(projectId), enabled: wellFormed }));

  /** `undefined`: no answer yet, or a refusal that proves nothing. `null`: the project is gone. */
  const project = $derived.by(() => {
    if (projectId && !wellFormed) return null;
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
        return;
      }

      if (store.project.id !== current.id || store.project.name !== current.name)
        store.setProject(current.id, current.name);
      if (store.pipeline.id && !isPipelinePath(pathname)) store.setPipeline(null, null);
    });
  });

  // The shell shows no sidebar and no crumb of a project that is not there.
  $effect(() => {
    if (!projectId || project !== null || routeParams().projectId !== projectId) return;
    goneProject.mark(projectId);
    return () => goneProject.clear(projectId);
  });

  return {
    get gone() {
      return project === null;
    },
  };
};

/**
 * Gives the store the name of the pipeline of the URL, for the crumbs. It reads the pipeline only
 * when the store does not name it (a link, a reload), and follows the answer in the cache.
 */
export const namePipeline = (pipelineId: string | undefined): void => {
  const context = toRune(contextStore);
  const named = $derived(context().pipeline.id === pipelineId && !!context().pipeline.name);
  const read = createQuery(() => ({
    ...pipelineQueries.byId(pipelineId ?? ''),
    enabled: isId(pipelineId) && !named && can(Permission.READ_PIPELINE),
  }));

  $effect(() => {
    const pipeline = read.data?.pipeline;
    if (!pipeline) return;

    untrack(() => {
      // During the exit animation this wrapper stays mounted: only the new one can write.
      if (routeParams().pipelineId !== pipelineId) return;

      const store = contextStore.getState();
      if (store.pipeline.id !== pipeline.id || store.pipeline.name !== pipeline.name)
        store.setPipeline(pipeline.id, pipeline.name);
    });
  });
};
