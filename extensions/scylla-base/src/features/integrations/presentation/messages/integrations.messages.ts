import { msg, plural } from '@lingui/core/macro';

export const integrationsMessages = {
  title: msg`Integrations`,
  description: msg`Connect GitHub or GitLab. All projects of this workspace can use the connection. Scylla starts pipelines on pushes and pull requests, checks out the code, and reports the result on each commit.`,
  providers: msg`Providers`,
  connections: msg`Connections`,

  github: msg`GitHub`,
  githubBlurb: msg`github.com · checks, statuses, triggers, checkout`,
  gitlab: msg`GitLab`,
  gitlabBlurb: msg`gitlab.com · service account token`,
  githubServer: msg`GitHub Enterprise Server`,
  gitlabSelfManaged: msg`GitLab self-managed`,
  later: msg({ context: 'release', message: 'Later' }),
  comingLater: msg`Coming in a later release`,
  notAvailableYet: msg`Not available yet`,
  connectGitHub: msg`Connect GitHub`,
  connectGitLab: msg`Connect GitLab`,
  addAccount: msg`Add an account`,
  addToken: msg`Add a token`,
  onlyAdmins: msg`Only the admins of the workspace can connect a Git provider.`,
  appMissing: msg`This server has no GitHub App. An admin of the instance must create it.`,
  secretKeyMissing: msg`The server has no key to encrypt the token.`,

  emptyTitle: msg`No Git provider connected`,
  emptyBody: msg`Connect GitHub or GitLab above. Then link a repository to a project, in the settings of the project.`,

  account: msg({ context: 'git', message: 'Account' }),
  repositories: msg`Repositories`,
  events: msg`Events`,
  state: msg`State`,
  actionsHeader: msg`Actions`,
  actions: (account: string) => msg`Actions for ${account}`,

  organization: msg`Organization`,
  user: msg({ context: 'git-account', message: 'User' }),
  serviceAccount: msg`Service account`,
  connectedOn: (kind: string, when: string) => msg`${kind} · connected ${when}`,
  allRepositories: msg`All repositories`,
  repositoryCount: (count: number) =>
    msg`${plural(count, { one: '# repository', other: '# repositories' })}`,
  projectCount: (count: number) => msg`${plural(count, { one: '# project', other: '# projects' })}`,
  webhooks: msg`Webhooks`,
  pollingEvery: (minutes: number) =>
    msg`${plural(minutes, { one: 'Polling every minute', other: 'Polling every # min' })}`,
  tokenExpiresOn: (date: string) => msg`The token expires on ${date}.`,
  tokenExpiredOn: (date: string) => msg`The token expired on ${date}.`,

  active: msg({ context: 'connection', message: 'Active' }),
  suspended: msg({ context: 'connection', message: 'Suspended' }),
  needsAttention: msg({ context: 'connection', message: 'Needs attention' }),
  disconnected: msg({ context: 'connection', message: 'Disconnected' }),

  appUninstalled: (account: string) =>
    msg`The GitHub App was uninstalled from ${account}. Reports, triggers and checkouts stopped.`,
  appSuspended: (account: string) => msg`An owner suspended the Scylla App on ${account}.`,
  permissionsNotAccepted: msg`Accept the new permissions of the Scylla App on GitHub.`,
  tokenExpired: msg`The GitLab token expired. Reports, triggers and checkouts stopped.`,
  tokenRevoked: msg`GitLab refused the token. Reports, triggers and checkouts stopped.`,
  tokenScopeMissing: msg`The token has no api scope.`,
  unknownReason: msg`GitLab or GitHub refused a call. Look at the connection on the provider.`,
  stoppedFor: (count: number) =>
    msg`${plural(count, {
      one: 'Reports, triggers and checkouts stopped for # project.',
      other: 'Reports, triggers and checkouts stopped for # projects.',
    })}`,

  installAgain: msg`Install again`,
  replaceToken: msg`Replace token`,
  configureOnGitHub: msg`Configure on GitHub`,
  openOnGitLab: msg`Open on GitLab`,
  disconnect: msg`Disconnect`,

  disconnectTitle: (account: string) => msg`Disconnect ${account}?`,
  disconnectProjects: (count: number) =>
    msg`${plural(count, {
      0: 'No project uses this connection.',
      one: '# project uses this connection. Reports, triggers and checkouts stop for it.',
      other: '# projects use this connection. Reports, triggers and checkouts stop for them.',
    })}`,
  disconnectGitHub: msg`The App stays installed on GitHub: uninstall it there.`,
  disconnectGitLab: msg`Scylla deletes the webhooks that it made. The token stays on GitLab: revoke it there.`,
  disconnectedToast: (account: string) => msg`${account} is disconnected`,

  connectedTo: (account: string, repositories: string) =>
    msg`Connected to ${account} (${repositories})`,
  nextStep: msg`Next: link a repository to a project, in Project › Settings › Repository.`,
  openProjects: msg`Open projects`,
  dismiss: msg`Dismiss`,
};
