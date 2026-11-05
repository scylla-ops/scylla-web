import { msg } from '@lingui/core/macro';

export const appsMessages = {
  app: msg`App`,
  apps: msg`Apps`,
  keyRevoked: msg`Key revoked`,
  roles: msg`Roles`,
  rolesDescription: msg`An app gets the roles of the workspace that it needs. An agent needs Runner to run jobs.`,
  noRoles: msg`No role: the app can do nothing yet.`,
  addRole: msg`Add a role`,
  removeRole: (role: string) => msg`Take back ${role}`,
  deleted: msg`App deleted`,
  keyRenamed: msg`Key renamed`,
  accessChanged: msg`Access changed`,
  disabledToast: (name: string) => msg`${name} is disabled`,
  enabledToast: (name: string) => msg`${name} is enabled`,
  noAgentConnected: msg`Jobs are waiting and no agent is connected.`,
  jobsQueuedCheckAgents: msg`Jobs are waiting. Ask an admin whether an agent is connected.`,
  setUpAnAgent: msg`Set up an agent`,
};
