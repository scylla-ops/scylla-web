import { msg, plural } from '@lingui/core/macro';

/** Keep the msgids (placeholder names included) or the French is lost. */
export const membershipMessages = {
  owner: msg`Owner`,
  ok: msg`OK`,
  owners: msg`Owners`,
  chooseRole: msg`Choose a role`,
  chooseProject: msg`Choose a project`,
  chooseMember: msg`Choose a member`,
  customRole: msg`Custom`,
  addMembers: msg`Add members`,
  addMembersHint: msg`They get the workspace role, and a role in each project that you choose.`,
  people: msg`People`,
  apps: msg`Apps`,
  removeChip: msg`Remove this person`,
  removeRow: msg`Remove`,
  addPeoplePlaceholder: msg`Add a name or an email`,
  emailOnlyHint: msg`You cannot browse the users of the server. Type an email to send an invitation.`,
  workspaceRole: msg`Workspace role`,
  addWorkspaceRole: msg`+ Add another workspace role`,
  projectRoles: msg`Project roles`,
  optional: msg`optional`,
  project: msg`Project`,
  addProjectRole: msg`+ Add a project role`,
  inviteHint: msg`An invited person gets one built-in workspace role when they accept. Give the project roles after that.`,
  whatTheyGet: msg`What they get`,
  seeAllPermissions: msg`See all permissions`,
  removeHint: msg`This person loses all of the access in this workspace at once.`,
  ownerStays: msg`An owner stays an owner. Change that in the owners card.`,
  removeFromWorkspaceAction: msg`Remove from the workspace`,
  workspaceRolesColumn: msg`Workspace roles`,
  added: msg`Added`,
  instanceAdmin: msg`Instance admin`,
  instance: msg`Instance`,
  everyProject: msg`Every project`,
  everyProjectAsAdmin: msg`Every project, as admin`,
  noProjectRole: msg`No project role`,
  memberActions: msg`Member actions`,
  seeAccess: msg`See the access`,
  changeRoles: msg`Change roles`,
  rolesChanged: msg`The roles changed`,
  addRole: msg`Add a role`,
  close: msg`Close`,
  rolesHere: msg`Roles here`,
  comesFrom: msg`Comes from`,
  projectRuleHint: msg`Add the person in Access › Members, then give the project role. An app gets roles only in the workspace that owns it.`,
  memberKind: msg`The kind of member`,
  searchMembers: msg`Search members`,
  fromInstanceHint: msg`Instance admins can act in every workspace. Change it in Instance › Users, not here.`,
  memberNotFound: msg`This member did not load.`,
  theirRoles: msg`Roles`,
  theirRolesHint: msg`On the instance, on the workspace and on its projects`,
  noInstanceRole: msg`No instance role`,
  direct: msg`Direct`,
  effectiveAccess: msg`Effective access`,
  scope: msg`The scope of the access`,
  resource: msg`Resource`,
  doesNotHave: msg`This member does not have it`,
  yes: msg`Yes`,
  from: msg`From`,
  legendHere: msg`From a role here`,
  legendAbove: msg`From a role above`,
  noSuchAction: msg`No such action`,
  ownersDescription: msg`The owners can delete the workspace and change its owners. No role gives that. The last owner stays.`,
  addOwner: msg`+ owner`,
  removeOwner: (name: string) => msg`Remove ${name} from the owners`,
  member: msg`Member`,
  members: msg`Members`,
  cancel: msg`Cancel`,
  add: msg`Add`,
  noRole: msg`No role`,

  selectAnWorkspace: msg`Select a workspace to see its members.`,
  workspaceNewDenied: msg`You don't have permission to admit members here.`,
  workspaceEmpty: msg`Nobody belongs to this workspace yet.`,
  removeFromWorkspace: msg`Remove from the workspace`,

  projectBlurb: msg`Everyone with access to this project, whether granted here or through a role on the workspace. Only project roles can be changed from this page.`,
  projectNewDenied: msg`You don't have permission to add members to this project.`,
  projectEmpty: msg`Nobody has access to this project yet.`,
  addToProject: msg`Add a member to this project`,
};

export const lockedRole = (names: string) =>
  msg`Locked. You do not have ${names}, so you cannot give it.`;
export const addTitle = (workspace: string) => msg`Add members to ${workspace}`;
export const addCount = (count: number) =>
  msg`${plural(count, { 0: 'Add members', one: 'Add # member', other: 'Add # members' })}`;
export const membersAdded = (count: number) =>
  msg`${plural(count, { one: '# member added', other: '# members added' })}`;
export const inEveryProject = (role: string, workspace: string, count: number) =>
  msg`${role} in ${workspace}: ${count} permissions in every project.`;
export const addsInProject = (role: string, count: number, project: string) =>
  msg`${role} adds ${count} in ${project}.`;
export const addsNothingInProject = (role: string, project: string) =>
  msg`${role} adds nothing in ${project}, because the workspace role covers it.`;
export const removedFrom = (name: string, workspace: string) =>
  msg`${name} removed from ${workspace}`;
export const removeTitle = (name: string, workspace: string) =>
  msg`Remove ${name} from ${workspace}?`;
export const needsWorkspaceRole = (workspace: string) =>
  msg`A project role needs a role in ${workspace}`;
export const changeTitle = (name: string) => msg`Change the roles of ${name}`;
export const membersOf = (project: string) => msg`Members of ${project}`;
export const changeIn = (scope: string) => msg`Change in ${scope}`;
export const projectRuleTitle = (workspace: string) =>
  msg`A project role needs a role in ${workspace} first`;
export const fromInstanceTitle = (name: string, workspace: string) =>
  msg`${name} is not a member of ${workspace}`;
export const tabCount = (label: string, count: number) => msg`${label} ${count}`;
export const workspaceBlurb = (workspace: string, again: string) =>
  msg`People and apps with a role in ${workspace}. A workspace role covers every project of ${again}. A project role adds power on one project.`;
export const whatCanDo = (name: string) =>
  msg`What ${name} can do, and which role gives it. This page is read only. To change this access, change the roles.`;
export const effectiveHint = (scope: string) =>
  msg`Each permission in ${scope}, from all of the roles`;
export const projectOption = (project: string) => msg`Project · ${project}`;
export const workspaceOption = (workspace: string) => msg`Workspace · ${workspace}`;
export const effectiveCell = (permission: string, scope: string) => msg`${permission} in ${scope}`;
export const openRole = (role: string) => msg`Open ${role}`;
export const addTo = (project: string) => msg`Add to ${project}`;
export const cannotRemove = (name: string) => msg`You cannot remove ${name}`;
export const lastOwnerBody = (name: string, workspace: string) =>
  msg`${name} is the last owner of ${workspace}. A workspace must always have one. Make another person an owner first.`;
export const cannotAdd = (name: string, workspace: string) =>
  msg`You cannot add ${name} to ${workspace}`;
export const appOutsideBody = (name: string, workspace: string) =>
  msg`${name} belongs to another workspace. An app gets roles only in its own workspace. Make a new app in ${workspace} instead.`;
export const newAppIn = (workspace: string) => msg`New app in ${workspace}`;
export const linkedApp = msg`This app`;
