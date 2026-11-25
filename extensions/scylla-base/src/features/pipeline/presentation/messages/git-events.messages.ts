import { msg } from '@lingui/core/macro';

/** The opt-in of an admin for the Git events of a Scylla pipeline in a project of files. */
export const gitEventsMessages = {
  off: msg`The push, pull request and tag triggers of this Scylla pipeline start no run: in a project of files, a workspace admin must allow them first.`,
  on: msg`Git events allowed by an admin`,
  allow: msg`Allow Git events`,
  allowDenied: msg`Only a workspace admin can allow the Git events.`,
  allowTitle: msg`Allow the Git events of this pipeline?`,
  allowBody: msg`The pushes, pull requests and tags of the repository will start this Scylla pipeline. Nobody reviews a Scylla pipeline in a pull request: each person who can edit it changes what runs on these events. A pull request from a fork still waits for an approval and gets no secret.`,
  revokeGitEvents: msg`Revoke`,
  revokeTitle: msg`Stop the Git events of this pipeline?`,
  revokeBody: msg`Its push, pull request and tag triggers stay, but they start no run until an admin allows them again.`,
};
