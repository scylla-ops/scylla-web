import { activeWorkspaceSlug, navigateTo, workspaceUrl } from '@platform/context';
import { userState } from '@platform/user-state';
import { createQuery } from '@scylla/core-sdk';
import { workspaceQueries } from '@base/features/workspace';
import { lastWorkspaceId } from './last-workspace.ts';

/** With no workspace, stays: the layout shows the welcome screen. */
export const redirectToWorkspace = (): void => {
  const workspaces = createQuery(() => workspaceQueries.mine());
  let stateKnown = $state(false);
  let done = false;

  void userState.whenLoaded().then(() => {
    stateKnown = true;
  });

  $effect(() => {
    if (done || !stateKnown || workspaces.isLoading) return;

    const list = workspaces.data ?? [];
    const last = list.find(item => item.id === lastWorkspaceId());
    const slug = last?.slug ?? activeWorkspaceSlug() ?? list[0]?.slug;
    if (!slug) return;

    done = true;
    navigateTo(workspaceUrl(slug), { replace: true });
  });
};
