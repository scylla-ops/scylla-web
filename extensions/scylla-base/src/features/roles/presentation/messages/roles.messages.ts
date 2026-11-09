import { msg, plural } from '@lingui/core/macro';
import { i18n, type MessageDescriptor } from '@lingui/core';
import type { CatalogArea } from '../../domain/structs/catalog.struct.ts';
import type { RoleHolder, RoleLevel } from '../../domain/entities/role.entity.ts';
import type { RoleFilter, RoleGroupId } from '../presenters/roles-list.presenter.ts';

export const countOf = (count: number, total: number) => msg`${count} of ${total}`;

export const workspaceRolesTitle = (workspace: string) => msg`Roles of ${workspace}`;

export const workspaceRolesHint = (workspace: string, again: string) =>
  msg`The roles that you can give in ${workspace}. Roles of ${again} are only seen there. Roles from the instance are the same in every workspace.`;

export const noAccessTitle = (workspace: string) => msg`You cannot see the roles of ${workspace}`;

export const deleteTitle = (role: string) => msg`Delete ${role}?`;

export const saveTitle = (role: string) => msg`Save ${role}?`;

export const holdersOnSave = (count: number) =>
  msg`${plural(count, {
    one: '# holder has this role. They get the change on their next request.',
    other: '# holders have this role. They get the change on their next request.',
  })}`;

export const holdersOnDelete = (count: number) =>
  msg`${plural(count, {
    one: '# holder has this role. Choose a role for them. Then the role is deleted.',
    other: '# holders have this role. Choose a role for them. Then the role is deleted.',
  })}`;

export const saveForHolders = (count: number) =>
  msg`${plural(count, { one: 'Save for # holder', other: 'Save for # holders' })}`;

export const holdersTotal = (count: number) => msg`Holders: ${count}`;

export const andMore = (count: number) => msg`and ${count} more`;

export const holderCount = (count: number) =>
  msg`${plural(count, { one: '# holder', other: '# holders' })}`;

export const peopleCount = (count: number) =>
  msg`${plural(count, { one: '# person', other: '# people' })}`;

export const agentsCount = (count: number) =>
  msg`${plural(count, { one: '# agent', other: '# agents' })}`;

export const appsCount = (count: number) =>
  msg`${plural(count, { one: '# app', other: '# apps' })}`;

export const projectsCount = (count: number) =>
  msg`${plural(count, { one: '# project', other: '# projects' })}`;

export const workspacesCount = (count: number) =>
  msg`${plural(count, { one: '# workspace', other: '# workspaces' })}`;

export const moreHolders = (count: number) =>
  msg`${plural(count, { one: '+# more', other: '+# more' })}`;

export const morePermissions = (count: number) =>
  msg`${plural(count, { one: '# more permission', other: '# more permissions' })}`;

export const missingPermissions = (names: string) =>
  msg`You do not have ${names}, so you cannot give it. Remove it from the role, or ask an admin to save the role.`;

export const removePermission = (names: string) => msg`Remove ${names}`;

export const nameTaken = msg`The owner already has a role with this name. Choose another name.`;

export const selectedOf = (count: number, total: number) => msg`${count} of ${total} selected`;

export const copiedFrom = (role: string) => msg`Copied from ${role}`;

export const selectTab = (count: number) => msg`Select all ${count} on this tab`;

export const clearTab = (count: number) => msg`Clear all ${count} on this tab`;

export const selectColumn = (action: string) => msg`Select the whole ${action} column`;

export const clearColumn = (action: string) => msg`Clear the whole ${action} column`;

export const allOf = (area: string) => msg`${area} · All actions`;

export const needsOthers = (names: string) => msg`Needs ${names}`;

export const rolesMessages = {
  roles: msg`Roles`,
  role: msg`Role`,
  instanceHint: msg`The roles of this Scylla server. Instance roles act on the whole server. Workspace and project roles here are offered in every workspace. Only instance admins see this page.`,
  newRole: msg`New role`,
  search: msg`Search roles`,
  filterLabel: msg`Filter the roles`,
  noMatch: msg`No role fits this search.`,
  loadError: msg`The roles did not load`,
  loadErrorHint: msg`The server did not answer in time. Nothing changed. Try again, or look at the status page.`,
  ownRolesHint: msg`Admins of this workspace make and change them.`,
  fromInstance: msg`From the instance`,
  fromInstanceHint: msg`Instance admins manage these roles. You can give them, but you cannot change them.`,
  noCustomRoles: msg`No custom roles yet`,
  noCustomRolesHint: msg`Make a role when the built-in roles give too much or too little. You can start from a built-in role and change its permissions.`,
  noAccessHint: msg`You need the permission Manage workspace roles. One of these people can give it to you.`,
  noAccessGivers: msg`A workspace admin or an instance admin.`,
  noAccessLink: msg`The Access menu does not show Roles to you. You opened this page from a link.`,
  seeMembers: msg`See members`,
  seeAllMembers: msg`See all members`,
  moveHoldersTo: msg`Move the holders to`,
  moveHoldersHint: msg`They keep their other roles. Compare the two roles before you move the holders.`,
  moveAndDelete: msg`Move holders and delete`,
  chooseRole: msg`Choose a role`,
  inEveryProject: msg`in every project`,
  inTheProject: msg`in the project`,
  notSaved: msg`The role was not saved`,
  lockedCell: msg`You do not have it, or not at this level`,
  retry: msg`Try again`,
  level: msg`Level`,
  holders: msg`Holders`,
  permissions: msg`Permissions`,
  builtIn: msg`Built-in`,
  custom: msg`Custom`,
  fullControl: msg`Full control`,
  viewOnly: msg`View only`,
  openToChange: msg`Open the role to change them.`,
  openToSee: msg`Open the role to see them all.`,
  back: msg`Roles`,
  cancel: msg`Cancel`,
  createRole: msg`Create role`,
  saveRole: msg`Save`,
  deleteRole: msg`Delete`,
  deleteTitle: msg`Delete this role?`,
  deleteHint: msg`You cannot undo this. A role that someone holds cannot be deleted.`,
  newRoleHint: msg`A role is a named set of permissions. You give it to people or apps on the instance, on a workspace or on a project.`,
  details: msg`Details`,
  name: msg`Name`,
  namePlaceholder: msg`Release manager`,
  description: msg`Description`,
  descriptionPlaceholder: msg`What this role does`,
  levelHint: msg`You can change the level only while no one holds the role.`,
  whoCanHold: msg`Who can hold it`,
  copyFromRole: msg`Copy from a role`,
  emptyRole: msg`Empty role`,
  emptyRoleHint: msg`Clears every permission`,
  undo: msg`Undo`,
  levelTabs: msg`Permission levels`,
  allOnTab: msg`All on this tab`,
  resource: msg`Resource`,
  onlyInInstance: msg`Only in instance roles`,
  legendOn: msg`Always on`,
  legendNone: msg`No such action`,
  legendOff: msg`The role does not have it`,
  readOnlyHint: msg`Built-in roles do not change. Duplicate the role to make a custom role from it.`,
  duplicate: msg`Duplicate`,
  about: msg`About this role`,
  holdersLabel: msg`Holders`,
  origin: msg`Origin`,
  key: msg`Key`,
  offeredIn: msg`Offered in`,
  everyWorkspace: msg`Every workspace`,
  thisWorkspace: msg`This workspace`,
  theInstance: msg`The whole server`,
  notFound: msg`This role does not exist.`,
  created: msg`The role is created.`,
  updated: msg`The role is saved.`,
  deleted: msg`The role is deleted.`,
  rolesChanged: msg`The instance roles are saved.`,
};

export const levelLabels: Record<RoleLevel, MessageDescriptor> = {
  platform: msg`Instance`,
  workspace: msg`Workspace`,
  project: msg`Project`,
};

export const fullControlHints: Record<RoleLevel, MessageDescriptor> = {
  platform: msg`the whole instance`,
  workspace: msg`also delete the workspace`,
  project: msg`also delete the project`,
};

export const levelHints: Record<RoleLevel, MessageDescriptor> = {
  platform: msg`Granted on the whole server. Only instance admins give it.`,
  workspace: msg`Granted on one workspace. Covers all of its projects.`,
  project: msg`Granted on one project.`,
};

const scopeHints = {
  platform: { platform: msg`On the whole server.` },
  workspace: {
    platform: msg`In every workspace of the server.`,
    workspace: msg`On the workspace where the role is granted. The Project tab covers every project of the workspace.`,
  },
  project: {
    platform: msg`In every project of the server.`,
    workspace: msg`In every project of the workspace where the role is granted.`,
    project: msg`On the project where the role is granted.`,
  },
} satisfies Record<RoleLevel, Partial<Record<RoleLevel, MessageDescriptor>>>;

/** Where the permissions of a tab apply, for a role of this level. */
export const scopeHint = (tab: RoleLevel, level: RoleLevel): MessageDescriptor | undefined =>
  (scopeHints[tab] as Partial<Record<RoleLevel, MessageDescriptor>>)[level];

export const holderLabels: Record<RoleHolder, MessageDescriptor> = {
  people: msg`People`,
  apps: msg`Apps`,
};

export const holderHints: Record<RoleHolder, MessageDescriptor> = {
  people: msg`Members of the workspace.`,
  apps: msg`Machine identities only, for example an agent or a CI.`,
};

export const filterLabels: Record<RoleFilter, MessageDescriptor> = {
  all: msg`All`,
  platform: msg`Instance`,
  workspace: msg`Workspace`,
  project: msg`Project`,
  machines: msg`Machines`,
};

export const groupLabels: Record<RoleGroupId, MessageDescriptor> = {
  platform: msg`Instance roles`,
  workspace: msg`Workspace roles`,
  project: msg`Project roles`,
  machines: msg`Machine roles`,
};

export const groupHints: Record<RoleGroupId, MessageDescriptor> = {
  platform: msg`Granted on the whole server`,
  workspace: msg`Offered in every workspace. A grant covers the projects of the workspace`,
  project: msg`Offered in every project`,
  machines: msg`Only for apps. An agent needs one to take jobs`,
};

export const actionLabels: Record<string, MessageDescriptor> = {
  view: msg`View`,
  create: msg`Create`,
  edit: msg`Edit`,
  delete: msg`Delete`,
  run: msg`Run`,
  manage: msg`Manage`,
};

export const areaLabels: Record<string, { title: MessageDescriptor; hint: MessageDescriptor }> = {
  users: { title: msg`Users`, hint: msg`Persons of the instance` },
  workspaces: { title: msg`Workspaces`, hint: msg`View is all workspaces` },
  instance_roles: { title: msg`Instance roles`, hint: msg`Make and change roles` },
  instance_access: { title: msg`Instance access`, hint: msg`Give instance roles` },
  instance_settings: { title: msg`Instance settings`, hint: msg`Sign-in, security` },
  workspace: { title: msg`Workspace`, hint: msg`Name and settings. Every member sees it` },
  members: { title: msg`Members`, hint: msg`People and apps of the workspace` },
  workspace_roles: { title: msg`Workspace roles`, hint: msg`Roles that the workspace owns` },
  apps: { title: msg`Apps`, hint: msg`Machine identities and their credentials` },
  agents: { title: msg`Agents`, hint: msg`Agents that run the jobs` },
  projects: { title: msg`Projects`, hint: msg`New projects in the workspace` },
  job_execution: { title: msg`Job execution`, hint: msg`Run takes a job. Edit reports its state` },
  project: { title: msg`Project`, hint: msg`Name and settings` },
  project_members: { title: msg`Project members`, hint: msg`Who has a role on the project` },
  pipelines: { title: msg`Pipelines`, hint: msg`Definitions and runs` },
  triggers: { title: msg`Triggers`, hint: msg`Schedules and webhooks that start runs` },
  jobs: { title: msg`Jobs`, hint: msg`Edit is cancel and retry` },
  job_logs: { title: msg`Job logs`, hint: msg`The output of the jobs` },
  secrets: { title: msg`Secrets`, hint: msg`Names only. Nobody sees a value` },
};

/** The translated names and descriptions of the built-in roles. The server sends the English text. */
export const builtinRoleLabels: Record<
  string,
  { name: MessageDescriptor; hint: MessageDescriptor }
> = {
  'instance-admin': {
    name: msg`Instance admin`,
    hint: msg`Full control of the server, of every workspace and of every project.`,
  },
  owner: {
    name: msg`Workspace owner`,
    hint: msg`Full control of one workspace, also its deletion and its owners.`,
  },
  'workspace-admin': {
    name: msg`Workspace admin`,
    hint: msg`Manages one workspace and its projects.`,
  },
  'workspace-member': {
    name: msg`Workspace member`,
    hint: msg`Works in every project of the workspace. Cannot manage members or roles.`,
  },
  'workspace-viewer': {
    name: msg`Workspace viewer`,
    hint: msg`Sees the workspace, its projects, runs and logs. Changes nothing.`,
  },
  'app-creator': {
    name: msg`App creator`,
    hint: msg`Creates apps and agents. Give it with another role.`,
  },
  'project-admin': { name: msg`Project admin`, hint: msg`Full control of one project.` },
  'project-editor': {
    name: msg`Project editor`,
    hint: msg`Edits and runs pipelines of one project. Cannot manage its secrets.`,
  },
  'project-viewer': { name: msg`Project viewer`, hint: msg`Sees one project, its runs and logs.` },
  agent: { name: msg`Agent`, hint: msg`Takes the jobs of every project of the workspace.` },
  'project-agent': { name: msg`Project agent`, hint: msg`Takes the jobs of one project.` },
};

/** "Delete secrets": the action and the area of a permission of the catalog. */
export const permissionLabel = (id: string, areas: readonly CatalogArea[]): string => {
  const area = areas.find(one => one.permissions.some(permission => permission.id === id));
  const permission = area?.permissions.find(one => one.id === id);
  if (!area || !permission) return id;
  const action = actionLabels[permission.action];
  const title = areaLabels[area.id]?.title;
  if (!action || !title) return id;
  return `${i18n._(action)} ${i18n._(title).toLowerCase()}`;
};
