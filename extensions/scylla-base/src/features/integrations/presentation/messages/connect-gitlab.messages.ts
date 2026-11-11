import { msg, plural } from '@lingui/core/macro';

export const connectGitLabMessages = {
  title: msg`Connect GitLab.com`,
  replaceTitle: (account: string) => msg`Replace the token of ${account}`,
  description: msg`Scylla uses the token of a service account. It reports results, creates the project webhooks, and checks out the code with it.`,
  replaceDescription: msg`Give a new token of the same account. Scylla checks it, then uses it in place of the old token.`,
  host: msg`Host`,
  gitlabCom: msg`GitLab.com`,
  gitlabComHost: msg`gitlab.com`,
  selfManaged: msg`Self-managed`,
  selfManagedHost: msg`Your own host`,
  later: msg({ context: 'release', message: 'Later' }),
  beforeYouStart: msg`Before you start`,
  stepServiceAccount: msg`Create a service account in your top-level group.`,
  stepMaintainer: msg`Add it as Maintainer to the group, or to the projects.`,
  stepToken: msg`Create a token for it with the scope api.`,
  serviceAccountDocs: msg`Read how to create a service account on GitLab`,
  token: msg`Token`,
  tokenHint: msg`Scylla checks the token with GitLab before it saves it. Jobs never get this token.`,
  cancel: msg`Cancel`,
  connect: msg`Connect`,
  replace: msg`Replace token`,

  accepted: msg`GitLab accepted the token. Scylla saved it.`,
  valid: msg`Valid`,
  scopes: msg`Scopes`,
  expires: msg`Expires`,
  expiresOn: (date: string, days: number) =>
    msg`${date} · ${plural(days, { one: 'in # day', other: 'in # days' })}`,
  noExpiry: msg`No expiry`,
  projects: msg`Projects`,
  projectCount: (count: number) => msg`${plural(count, { one: '# project', other: '# projects' })}`,
  done: msg`Done`,

  notAServiceAccount: msg`This is not a service account or a bot. Reports stop when the person leaves the group.`,
  expiresSoon: (days: number) =>
    msg`${plural(days, { one: 'The token expires in # day.', other: 'The token expires in # days.' })}`,
  roleDeveloper: msg`Role Developer: Scylla can report, but cannot create the webhook or block merges.`,

  tokenInvalid: msg`GitLab refused this token.`,
  tokenScopeMissing: msg`The token has no api scope.`,
  secretKeyMissing: msg`The server has no key to encrypt the token.`,
  connectionExists: msg`This account already has a connection in this workspace. Replace its token.`,
  accountChanged: msg`This token is for another account. Give a token of the same account.`,
  providerUnavailable: msg`GitLab does not answer. Try again later.`,
};
