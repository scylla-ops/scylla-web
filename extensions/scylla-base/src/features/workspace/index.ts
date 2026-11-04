export type { WorkspaceEntity, WorkspaceOwner } from './domain/entities/workspace.entity.ts';
export {
  invalidateWorkspaceMembers,
  workspaceMutations,
  workspaceQueries,
  ownerMutations,
  ownerQueries,
  WORKSPACE_OWNERS_QUERY_KEY,
  MY_WORKSPACES_QUERY_KEY,
  WORKSPACES_QUERY_KEY,
  WORKSPACE_MEMBERS_QUERY_KEY,
} from './presentation/workspace.queries.ts';
export { createWorkspaceItems } from './presentation/presenters/workspace-form.presenter.ts';
/** Loaders: a barrel must not re-export a component. */
export const loadAddWorkspaceDialog = () =>
  import('./presentation/ui/AddWorkspaceDialog/AddWorkspaceDialog.svelte');
export const loadWorkspaceList = () => import('./presentation/ui/WorkspaceList/WorkspaceList.svelte');
