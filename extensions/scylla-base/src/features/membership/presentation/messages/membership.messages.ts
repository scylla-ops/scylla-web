import { msg, plural } from '@lingui/core/macro';

/** Keep the msgids (placeholder names included) or the French is lost. */
export const membershipMessages = {
  ok: msg`OK`,
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
  workspace: msg`Workspace`,
  addProjectRole: msg`+ Add a project role`,
  inviteHint: msg`An invited person gets one built-in workspace role when they accept. Give the project roles after that.`,
  whatTheyGet: msg`What they get`,
  seeAllPermissions: msg`See all permissions`,
  removeHint: msg`This person loses all of the access in this workspace at once.`,
  ownerStays: msg`Only an owner can take back the role Workspace owner. This role stays.`,
  ownerNotInvited: msg`An invitation does not carry the role Workspace owner. Give it after the person joins.`,
  removeFromWorkspaceAction: msg`Remove from the workspace`,
  workspaceRolesColumn: msg`Workspace roles`,
  added: msg`Added`,
  noProjectRole: msg`No project role`,
  memberActions: msg`Member actions`,
  seeAccess: msg`See the access`,
  changeRoles: msg`Change roles`,
  eachChangeApplies: msg`Each change applies at once.`,
  rolesOnProjects: msg`Roles on projects`,
  rolesFromWorkspace: msg`Roles from the workspace`,
  keep: msg`Keep`,
  close: msg`Close`,
  rolesHere: msg`Roles here`,
  comesFrom: msg`Comes from`,
  projectRuleHint: msg`Add the person in Access › Members, then give the project role. An app gets roles only in the workspace that owns it.`,
  memberKind: msg`The kind of member`,
  searchMembers: msg`Search members`,
  memberNotFound: msg`This member did not load.`,
  theirRoles: msg`Roles`,
  theirRolesHint: msg`On the workspace and on its projects`,
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
  member: msg`Member`,
  members: msg`Members`,
  cancel: msg`Cancel`,
  noRole: msg`No role`,

  selectAnWorkspace: msg`Select a workspace to see its members.`,
  workspaceNewDenied: msg`You don't have permission to admit members here.`,
  workspaceEmpty: msg`Nobody belongs to this workspace yet.`,
  removeFromWorkspace: msg`Remove from the workspace`,

  projectBlurb: msg`Everyone with access to this project, whether granted here or through a role on the workspace. Only project roles can be changed from this page.`,
  projectNewDenied: msg`You don't have permission to add members to this project.`,
  projectEmpty: msg`Nobody has access to this project yet.`,
  noMemberToAdd: msg`No member left to add`,
  addToProject: msg`Add a member to this project`,
};

export const lockedRole = (names: string) =>
  msg`Locked. You do not have ${names}, so you cannot give it.`;
export const addTitle = (workspace: string) => msg`Add members to ${workspace}`;
export const morePeople = (count: number) =>
  msg`${plural(count, { one: '# more person. Type to narrow the list.', other: '# more people. Type to narrow the list.' })}`;
export const addCount = (count: number) =>
  msg`${plural(count, { 0: 'Add members', one: 'Add # member', other: 'Add # members' })}`;
export const membersAdded = (count: number) =>
  msg`${plural(count, { one: '# member added', other: '# members added' })}`;
export const allProjectsRole = (role: string) => msg`All projects · ${role}`;
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
export const rolesIn = (scope: string) => msg`Roles in ${scope}`;
export const removeFrom = (scope: string) => msg`Remove from ${scope}`;
export const lastRoleWarning = (name: string, workspace: string) =>
  msg`This is the last role of ${name} in ${workspace}. This person leaves the workspace and loses the roles on its projects.`;
export const membersOf = (project: string) => msg`Members of ${project}`;
export const changeIn = (scope: string) => msg`Change in ${scope}`;
export const projectRuleTitle = (workspace: string) =>
  msg`A project role needs a role in ${workspace} first`;
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
