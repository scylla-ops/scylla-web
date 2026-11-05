import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { RoleHolder, RoleLevel } from '../../domain/entities/role.entity.ts';
import type { RoleFilter, RoleGroupId } from '../presenters/roles-list.presenter.ts';

export const countOf = (count: number, total: number) => msg`${count} of ${total}`;

export const selectedOf = (count: number, total: number) =>
  msg`${count} of ${total} selected · Edit, Delete and Run also select View`;

export const rolesMessages = {
  roles: msg`Roles`,
  role: msg`Role`,
  instanceHint: msg`The roles of this Scylla server. Instance roles act on the whole server. Workspace and project roles here are offered in every workspace. Only instance admins see this page.`,
  workspaceHint: msg`The roles that you can give in this workspace. Built-in roles do not change.`,
  newRole: msg`New role`,
  search: msg`Search roles`,
  filterLabel: msg`Filter the roles`,
  noMatch: msg`No role fits this search.`,
  loadError: msg`The roles did not load.`,
  retry: msg`Try again`,
  level: msg`Level`,
  type: msg`Type`,
  holders: msg`Holders`,
  permissions: msg`Permissions`,
  builtIn: msg`Built-in`,
  custom: msg`Custom`,
  fullControl: msg`Full control`,
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
  levelFixed: msg`You cannot change the level after you create the role.`,
  whoCanHold: msg`Who can hold it`,
  startFrom: msg`Start from`,
  startFromEmpty: msg`Empty role`,
  startFromHint: msg`Copies its permissions. Then change them in the table.`,
  liveTitle: msg`Live at once`,
  liveHint: msg`When you save, every holder of the role gets the new permissions on the next request.`,
  resource: msg`Resource`,
  selectAll: msg`Select all`,
  onlyInInstance: msg`Only in instance roles`,
  notInLevel: msg`Not at this level`,
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

export const levelHints: Record<RoleLevel, MessageDescriptor> = {
  platform: msg`Granted on the whole server. Only instance admins give it.`,
  workspace: msg`Granted on one workspace. Covers all of its projects.`,
  project: msg`Granted on one project.`,
};

export const sectionHints: Record<RoleLevel, MessageDescriptor> = {
  platform: msg`Users, workspaces, instance roles and settings`,
  workspace: msg`On the workspace where the role is granted`,
  project: msg`In every project of the workspace`,
};

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
  'workspace-creator': {
    name: msg`Workspace creator`,
    hint: msg`Creates workspaces. Becomes owner of each workspace that it creates.`,
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
