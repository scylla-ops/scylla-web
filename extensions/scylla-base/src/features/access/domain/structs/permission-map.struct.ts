import { Permission, PermissionScope } from '@platform/authz';
import type { ObjectKind } from './object-ref.struct.ts';

/**
 * The permission names of the server for each `Permission` of the UI, on each kind of object.
 * `CheckPermissions` answers them for one object in one call. A name that the definition of the
 * kind does not have is refused by the server: each list is exact.
 */
type Names = Partial<Record<ObjectKind, string>>;

const MAP: Partial<Record<Permission, Names>> = {
  // The instance: the users, the workspaces and the roles.
  [Permission.LIST_USERS]: { platform: 'list_users' },
  [Permission.READ_USER]: { platform: 'get_user' },
  [Permission.CREATE_USER]: { platform: 'create_user' },
  [Permission.UPDATE_USER]: { platform: 'update_user' },
  [Permission.DELETE_USER]: { platform: 'delete_user' },
  [Permission.MANAGE_SYSTEM_GRANTS]: { platform: 'grant' },
  [Permission.MANAGE_INSTANCE_ADMINS]: { platform: 'grant_instance_admin' },
  [Permission.LIST_ROLES]: { platform: 'list_roles' },
  [Permission.MANAGE_ROLES]: { platform: 'create_role' },
  [Permission.CREATE_WORKSPACE]: { platform: 'create_workspace' },
  [Permission.MANAGE_INSTANCE_SETTINGS]: { platform: 'update_instance_settings' },
  // A workspace.
  [Permission.READ_WORKSPACE]: { workspace: 'get_workspace' },
  [Permission.UPDATE_WORKSPACE]: { workspace: 'update_workspace' },
  [Permission.DELETE_WORKSPACE]: { workspace: 'delete_workspace' },
  [Permission.MANAGE_OWNERS]: { workspace: 'add_owner' },
  [Permission.MANAGE_WORKSPACE_ROLES]: { workspace: 'list_roles' },
  [Permission.LIST_WORKSPACE_MEMBERS]: { workspace: 'list_access' },
  [Permission.ADD_WORKSPACE_MEMBER]: { workspace: 'grant' },
  [Permission.REMOVE_WORKSPACE_MEMBER]: { workspace: 'revoke' },
  [Permission.MANAGE_WORKSPACE_GRANTS]: { workspace: 'grant' },
  [Permission.CREATE_PROJECT]: { workspace: 'create_project' },
  [Permission.LIST_PROJECTS_BY_WORKSPACE]: { workspace: 'list_projects' },
  // A project, or each project of a workspace.
  [Permission.READ_PROJECT]: { workspace: 'get_project', project: 'get_project' },
  [Permission.UPDATE_PROJECT]: { workspace: 'update_project', project: 'update_project' },
  [Permission.DELETE_PROJECT]: { workspace: 'delete_project', project: 'delete_project' },
  [Permission.LIST_PROJECT_MEMBERS]: { project: 'list_access' },
  [Permission.ADD_PROJECT_MEMBER]: { project: 'grant' },
  [Permission.REMOVE_PROJECT_MEMBER]: { project: 'revoke' },
  [Permission.MANAGE_PROJECT_GRANTS]: { project: 'grant' },
  // The secrets of a project.
  [Permission.CREATE_SECRET]: { workspace: 'create_secret', project: 'create_secret' },
  [Permission.UPDATE_SECRET]: { workspace: 'update_secret', project: 'update_secret' },
  [Permission.DELETE_SECRET]: { workspace: 'delete_secret', project: 'delete_secret' },
  [Permission.LIST_SECRETS]: { workspace: 'list_secrets', project: 'list_secrets' },
  // The pipelines and their jobs.
  [Permission.CREATE_PIPELINE]: { workspace: 'create_pipeline', project: 'create_pipeline' },
  [Permission.READ_PIPELINE]: { workspace: 'get_pipeline', project: 'get_pipeline' },
  [Permission.UPDATE_PIPELINE]: { workspace: 'update_pipeline', project: 'update_pipeline' },
  [Permission.DELETE_PIPELINE]: { workspace: 'delete_pipeline', project: 'delete_pipeline' },
  [Permission.RUN_PIPELINE]: { workspace: 'run_pipeline', project: 'run_pipeline' },
  [Permission.EXECUTE_JOB]: { workspace: 'run_pipeline', project: 'run_pipeline' },
  [Permission.LIST_PIPELINES_BY_PROJECT]: {
    workspace: 'list_project_pipelines',
    project: 'list_project_pipelines',
  },
  [Permission.LIST_PIPELINES_BY_WORKSPACE]: { workspace: 'list_workspace_pipelines' },
  [Permission.READ_JOB]: { workspace: 'get_job', project: 'get_job' },
  [Permission.UPDATE_JOB]: { workspace: 'cancel_job', project: 'cancel_job' },
  [Permission.CREATE_JOB]: { workspace: 'rerun_job', project: 'rerun_job' },
  [Permission.DELETE_JOB]: { workspace: 'delete_job', project: 'delete_job' },
  [Permission.LIST_JOBS_BY_PIPELINE]: {
    workspace: 'list_pipeline_jobs',
    project: 'list_pipeline_jobs',
  },
  [Permission.LIST_JOBS_BY_PROJECT]: {
    workspace: 'list_pipeline_jobs',
    project: 'list_pipeline_jobs',
  },
  [Permission.LIST_JOBS_BY_WORKSPACE]: { workspace: 'list_workspace_jobs' },
  [Permission.READ_JOB_LOGS]: { workspace: 'tail_job_logs', project: 'tail_job_logs' },
  // The triggers of a pipeline.
  [Permission.MANAGE_TRIGGERS]: { workspace: 'create_trigger', project: 'create_trigger' },
  // The apps of a workspace; an agent is an app that runs jobs.
  [Permission.CREATE_APP]: { workspace: 'create_app' },
  [Permission.READ_APP]: { workspace: 'get_app' },
  [Permission.READ_APP_STATS]: { workspace: 'get_app' },
  [Permission.DELETE_APP]: { workspace: 'delete_app' },
  [Permission.LIST_APPS_BY_WORKSPACE]: { workspace: 'list_apps' },
  [Permission.CREATE_AGENT]: { workspace: 'create_app' },
  [Permission.LIST_AGENTS]: { workspace: 'list_apps' },
};

/**
 * What each signed-in user may do: the server checks these on the caller itself (the `actor`
 * definition), which `CheckPermissions` does not answer.
 */
export const EVERY_USER: readonly Permission[] = [Permission.LIST_WORKSPACES];

/** The scope of the UI for each kind of object. */
export const SCOPE_OF: Record<ObjectKind, PermissionScope> = {
  platform: PermissionScope.SYSTEM,
  workspace: PermissionScope.WORKSPACE,
  project: PermissionScope.PROJECT,
};

/** The names to ask on an object of `kind`, each one once. */
export const namesFor = (kind: ObjectKind): string[] => [
  ...new Set(Object.values(MAP).flatMap(names => (names[kind] ? [names[kind]] : []))),
];

/** The `Permission`s that the allowed names give on an object of `kind`. */
export const permissionsFrom = (kind: ObjectKind, allowed: ReadonlySet<string>): Permission[] =>
  Object.entries(MAP).flatMap(([permission, names]) => {
    const name = names[kind];
    return name && allowed.has(name) ? [Number(permission)] : [];
  });
