import { msg } from '@lingui/core/macro';

export const layoutMessages = {
  organization: msg`Workspace`,
  project: msg`Project`,
  system: msg`System`,
  selectOrganization: msg`Select Workspace`,
  createOrganization: msg`Create a workspace`,
  welcome: msg`Welcome to Scylla!`,
  getStarted: msg`To get started, please create your first workspace.`,
  noOrganization: msg`You are not a member of a workspace yet. Ask an administrator to add you.`,
  create: msg`Create`,
  loading: msg`Loading...`,
  account: msg`Account`,
  signOut: msg`Sign out`,
  signedInAs: (name: string) => msg`Signed in as ${name}`,
  back: msg`Back`,
  newBadge: msg`New`,
  whatsNew: (version: string) => msg`What's new in Scylla ${String(version)}`,
  whatsNewDescription: msg`Here is what landed in this version.`,
  gotIt: msg`Got it`,
};
