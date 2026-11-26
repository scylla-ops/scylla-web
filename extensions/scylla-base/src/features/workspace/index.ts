export type {
  WorkspaceEntity,
  WorkspaceOrder,
  WorkspaceOwnerEntity,
  WorkspacePage,
  WorkspaceSearch,
} from './domain/entities/workspace.entity.ts';
export {
  ALL_WORKSPACES_QUERY_KEY,
  invalidateWorkspaceMembers,
  workspaceMutations,
  workspaceQueries,
  MY_WORKSPACES_QUERY_KEY,
  WORKSPACES_QUERY_KEY,
  WORKSPACE_MEMBERS_QUERY_KEY,
} from './presentation/workspace.queries.ts';
export { createWorkspaceOf } from './presentation/workspace-of.state.svelte.ts';
export {
  OTHERS_LIMIT,
  SEARCH_DELAY_MS,
  allWorkspacesHref,
  ownerHint,
  ownerName,
  workspaceCounts,
  workspaceRoleLabel,
} from './presentation/presenters/workspace-owner.presenter.ts';
export { createWorkspaceItems } from './presentation/presenters/workspace-form.presenter.ts';
export {
  DEFAULT_WORKSPACE_COLOR,
  DEFAULT_WORKSPACE_GLYPH,
  workspaceIconChange,
  workspaceIconProps,
} from './presentation/presenters/workspace-icon.presenter.ts';
/** Loaders: a barrel must not re-export a component. */
export const loadAddWorkspaceDialog = () =>
  import('./presentation/ui/AddWorkspaceDialog/AddWorkspaceDialog.svelte');
export const loadWorkspaceList = () => import('./presentation/ui/WorkspaceList/WorkspaceList.svelte');
