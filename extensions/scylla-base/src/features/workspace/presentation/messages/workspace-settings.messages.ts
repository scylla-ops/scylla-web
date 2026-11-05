import { msg } from '@lingui/core/macro';

export const workspaceSettingsMessages = {
  title: msg`Security`,
  description: (workspace: string) =>
    msg`Settings of the workspace ${workspace}. Only admins of ${workspace} see this page.`,
  personalTokens: (workspace: string) => msg`Personal tokens in ${workspace}`,
  personalTokensBody: (workspace: string) =>
    msg`Members can use their personal tokens on the projects, pipelines and secrets of ${workspace}. When off, ${workspace} refuses every personal token at once. App tokens and CI identities do not change.`,
  hint: msg`Turning it off asks for a confirmation. The instance switch comes first: when an instance admin turns personal tokens off on the server, this switch is off and locked.`,
  lockedHint: msg`An instance admin turned personal tokens off on this server, so this switch is off and locked.`,
  confirmTitle: (workspace: string) => msg`Turn off personal tokens in ${workspace}?`,
  confirmBody: (workspace: string) =>
    msg`${workspace} refuses them at once: scripts that use them get "403 Permission denied" here. They still work in other workspaces. App tokens and CI identities do not change. You can turn them on again at any time.`,
  confirm: msg`Turn off`,
  turnedOn: msg`Personal tokens allowed in this workspace`,
  turnedOff: msg`Personal tokens refused in this workspace`,
};
