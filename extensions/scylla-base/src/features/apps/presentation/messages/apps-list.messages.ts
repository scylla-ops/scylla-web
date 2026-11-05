import { msg, plural } from '@lingui/core/macro';

export const appsListMessages = {
  blurb: msg`Machine identities of your team: a CI, a script or a server that calls the Scylla API.`,
  add: msg`Add an app`,
  needCreate: (workspace: string) => msg`You need the permission "Create apps" in ${workspace}`,
  firstTitle: msg`Add your first app`,
  firstBody: msg`An app connects with an API token, a CI identity (no secret) or a key pair. An agent is a special app that runs jobs.`,
  emptyTitle: msg`No app yet`,
  askAdmin: (workspace: string) =>
    msg`Admins of ${workspace} can create apps. Ask an admin for the role "App creator".`,
  columnApp: msg`App`,
  columnCredentials: msg`Credentials`,
  columnAccess: msg`Access`,
  columnLastUsed: msg`Last used`,
  columnActions: msg`Actions`,
  disabled: msg`Disabled`,
  noCredential: msg`No credential`,
  noRole: msg`No role`,
  never: msg`Never`,
  openApp: msg`Open app`,
  roleOn: (role: string, on: string) => msg`${role} of ${on}`,
  apiToken: msg`API token`,
  ciIdentity: msg`CI identity`,
  keyPair: msg`Key pair`,
  expiresIn: (count: number) =>
    msg`${plural(count, { 0: 'expires today', one: 'expires in # day', other: 'expires in # days' })}`,
  expiredOn: (day: string) => msg`expired on ${day}`,
  repositoryOn: (repository: string, branch: string) => msg`${repository} on ${branch}`,
  repositoryIn: (repository: string, environment: string) =>
    msg`${repository}, environment ${environment}`,
  disableTitle: (name: string) => msg`Disable ${name}?`,
  disableBody: msg`It gets no token until you enable it. Calls with its tokens fail at once.`,
  disable: msg`Disable`,
  deleteTitle: (name: string) => msg`Delete ${name}?`,
  deleteBody: msg`Its credentials and roles go. Calls with its tokens fail at once.`,
  delete: msg`Delete`,
};
