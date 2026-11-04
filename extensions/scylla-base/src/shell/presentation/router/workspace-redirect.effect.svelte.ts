import { activeWorkspaceSlug, navigateTo, workspaceUrl } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { workspaceQueries } from '@base/features/workspace';

/** With no workspace, stays: the layout shows the welcome screen. */
export const redirectToWorkspace = (): void => {
  const workspaces = createQuery(() => workspaceQueries.mine());
  let done = false;

  $effect(() => {
    if (done || workspaces.isLoading) return;

    const slug = activeWorkspaceSlug() ?? workspaces.data?.[0]?.slug;
    if (!slug) return;

    done = true;
    navigateTo(workspaceUrl(slug), { replace: true });
  });
};
