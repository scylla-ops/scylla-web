import { msg, plural } from '@lingui/core/macro';

export const instanceSettingsMessages = {
  title: msg`Settings`,
  workspaceLimit: msg`Workspaces per user`,
  workspaceLimitBody: msg`The number of workspaces that one user can create. The personal workspace does not count, and an instance admin has no limit. A lower number removes no workspace.`,
  workspaceLimitSave: msg`Save`,
  workspaceLimitSaved: msg`The limit of the workspaces is saved`,
  description: msg`Settings of this Scylla server. Only instance admins see this page.`,
  personalTokens: msg`Personal tokens`,
  personalTokensBody: msg`Users can make tokens that act as themselves. When off, every personal token stops working at once. App tokens are not affected.`,
  hint: msg`Turning it off asks for a confirmation and shows how many tokens stop. Workspace admins can also turn personal tokens off in their own workspace.`,
  confirmTitle: msg`Turn off personal tokens?`,
  confirmBody: (count: number) =>
    msg`${plural(count, {
      0: 'No active token stops.',
      one: '# token stops working at once.',
      other: '# tokens stop working at once.',
    })} Scripts that use them get "401 Unauthorized". Users cannot make new tokens. App tokens and CI identities do not change. You can turn them on again: the tokens that did not expire then work again.`,
  confirm: msg`Turn off`,
  turnedOn: msg`Personal tokens turned on`,
  turnedOff: msg`Personal tokens turned off`,
};
