import { msg } from '@lingui/core/macro';

export const layoutMessages = {
  organization: msg`Organization`,
  project: msg`Project`,
  system: msg`System`,
  selectOrganization: msg`Select Organization`,
  welcome: msg`Welcome to Scylla!`,
  getStarted: msg`To get started, please create your first organization.`,
  create: msg`Create`,
  loading: msg`Loading...`,
  settings: msg`Settings`,
  logOut: msg`Log out`,
  newBadge: msg`New`,
  whatsNew: (version: string) => msg`What's new in Scylla ${String(version)}`,
  whatsNewDescription: msg`Here is what landed in this version.`,
  gotIt: msg`Got it`,
};
