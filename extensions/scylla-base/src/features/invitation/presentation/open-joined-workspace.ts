import { getQueryClient } from '@scylla/core-sdk';
import { contextStore, navigateTo, workspaceUrl } from '@platform/context';
import { workspaceQueries, MY_WORKSPACES_QUERY_KEY } from '@base/features/workspace';

/** Makes the workspace that the user just joined the active one, and opens it. */
export const openJoinedWorkspace = async (workspaceId: string): Promise<void> => {
  const client = getQueryClient();
  await client.invalidateQueries({ queryKey: MY_WORKSPACES_QUERY_KEY() });
  const workspaces = await client.fetchQuery(workspaceQueries.mine());
  const workspace = workspaces.find(item => item.id === workspaceId);
  if (!workspace) {
    navigateTo('/', { replace: true });
    return;
  }
  contextStore.getState().setWorkspace(workspace.id, workspace.name, workspace.slug);
  navigateTo(workspaceUrl(workspace.slug), { replace: true });
};
