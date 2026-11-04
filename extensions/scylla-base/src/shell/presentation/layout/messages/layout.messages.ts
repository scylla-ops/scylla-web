import { msg } from '@lingui/core/macro';

export const layoutMessages = {
  workspace: msg`Workspace`,
  project: msg`Project`,
  access: msg`Access`,
  instance: msg`Instance`,
  instanceAdmins: msg`Instance · admins`,
  selectWorkspace: msg`Select Workspace`,
  createWorkspace: msg`Create a workspace`,
  welcome: msg`Welcome to Scylla!`,
  getStarted: msg`To get started, please create your first workspace.`,
  noWorkspace: msg`You are not a member of a workspace yet. Ask an administrator to add you.`,
  create: msg`Create`,
  account: msg`Account`,
  signOut: msg`Sign out`,
  signedInAs: (name: string) => msg`Signed in as ${name}`,
  back: msg`Back`,
  newBadge: msg`New`,
  whatsNew: (version: string) => msg`What's new in Scylla ${String(version)}`,
  whatsNewDescription: msg`Here is what landed in this version.`,
  gotIt: msg`Got it`,
};
