import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';

/** The name of each fixed role. */
export const roleMessages: Record<string, MessageDescriptor> = {
  owner: msg`Workspace owner`,
  admin: msg`Admin`,
  member: msg`Member`,
  editor: msg`Editor`,
  viewer: msg`Viewer`,
  runner: msg`Runner`,
};

/** What each role allows, under its name in a picker. */
export const roleDescriptions: Record<string, MessageDescriptor> = {
  owner: msg`Everything, the deletion of the workspace and its owners included.`,
  admin: msg`Everything in the workspace, its members included.`,
  member: msg`Creates and changes projects and pipelines.`,
  editor: msg`Changes the pipelines of the project.`,
  viewer: msg`Reads only.`,
  runner: msg`Runs the jobs: for an agent.`,
};
