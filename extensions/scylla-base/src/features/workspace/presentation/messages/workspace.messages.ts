import { msg } from '@lingui/core/macro';

export const workspaceMessages = {
  members: msg`Members`,
  current: msg`Current workspace`,
  edit: msg`Edit`,
  delete: msg`Delete`,

  createTitle: msg`Create a new workspace`,
  createDescription: msg`Enter a name for your new workspace, and an address if you want to choose it. You can change both later.`,
  createSubmit: msg`Create Workspace`,
  creating: msg`Creating...`,

  editTitle: msg`Edit workspace`,
  editDescription: msg`Update the name and the address of the workspace.`,
  save: msg`Save`,
  saving: msg`Saving...`,
  workspaceName: msg`Workspace name`,
  slug: msg`Address`,
  cancel: msg`Cancel`,
  iconTitle: msg`Workspace icon`,
  iconDescription: msg`It shows in the workspace switcher, in the list of the workspaces and at the top of the settings.`,
  changeIcon: msg`Change the icon…`,
  iconSaved: msg`Icon saved`,
  iconNotSaved: (reason: string) =>
    msg`The workspace is created, but its icon is not saved: ${reason}`,
  findWorkspace: msg`Find a workspace`,
  noWorkspaceMatch: msg`No workspace matches this search.`,

  findWorkspaceOrOwner: msg`Find a workspace or an owner`,
  yourWorkspaces: msg`Your workspaces`,
  otherWorkspaces: msg`Other workspaces`,
  allWorkspaces: msg`All workspaces…`,
  ownedBy: (owner: string, hint: string) => msg`Owner: ${owner} (${hint})`,

  roleOwner: msg`Owner`,
  roleAdmin: msg`Admin`,
  roleMember: msg`Member`,
  roleViewer: msg`Viewer`,
  roleInstanceAdmin: msg`Instance admin`,
  memberCount: (count: number) => msg`Members: ${count}`,
  projectCount: (count: number) => msg`Projects: ${count}`,
};
