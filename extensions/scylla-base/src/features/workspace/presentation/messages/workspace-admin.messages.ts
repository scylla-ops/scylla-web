import { msg } from '@lingui/core/macro';

export const workspaceAdminMessages = {
  title: msg`Workspaces`,
  hint: msg`Each workspace of this server, with its owner. Select a workspace to open it.`,
  search: msg`Find a workspace or an owner`,
  order: msg`Order`,
  orderName: msg`Name`,
  orderNewest: msg`Newest first`,
  orderOldest: msg`Oldest first`,
  orderActivity: msg`Last activity`,

  workspace: msg`Workspace`,
  owner: msg`Owner`,
  members: msg`Members`,
  projects: msg`Projects`,
  created: msg`Created`,
  lastActivity: msg`Last activity`,
  noActivity: msg`No activity`,
  noOwner: msg`No owner`,
  openWorkspace: (name: string) => msg`Open the workspace ${name}`,

  loadError: msg`The workspaces did not load.`,
  noWorkspace: msg`No workspace matches this search.`,
};
