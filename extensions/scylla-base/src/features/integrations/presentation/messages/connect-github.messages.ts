import { msg } from '@lingui/core/macro';

export const connectGitHubMessages = {
  title: msg`Connect GitHub`,
  description: msg`Scylla installs its GitHub App on one account or organization. You choose the repositories on GitHub, and you can change them later.`,
  asksFor: msg`The Scylla App asks for`,
  readCode: msg`Read your code, for the checkout and the pipeline files`,
  writeChecks: msg`Write checks on your commits`,
  readPullRequests: msg`Read pull requests`,
  manageRules: msg`Manage branch rules, only for "Block the merge"`,
  events: msg`Events: push, pull request, check run, check suite, installation. Scylla never pushes code and never writes to your repositories.`,
  cancel: msg`Cancel`,
  continueOnGitHub: msg`Continue on GitHub`,

  connecting: msg`Connecting to GitHub…`,
  failedTitle: msg`Scylla could not connect GitHub`,
  stateExpired: msg`The link expired. Start again.`,
  installationNotVisible: msg`You cannot see this installation on GitHub.`,
  installCancelled: msg`The install was cancelled.`,
  pendingApproval: msg`An organization owner must approve the request on GitHub.`,
  backToIntegrations: msg`Back to Integrations`,

  chooseTitle: msg`Choose a GitHub account`,
  chooseBody: msg`The Scylla App is installed on these accounts. Connect one of them to this workspace, or install the App on another account.`,
  connect: msg`Connect`,
  connectAccount: (account: string) => msg`Connect ${account}`,
  installElsewhere: msg`Install on another account`,

  savedTitle: msg`Your changes on GitHub are saved`,
  savedBody: msg`Scylla uses the new settings of the installation.`,
  openIntegrations: msg`Open Integrations`,
};
