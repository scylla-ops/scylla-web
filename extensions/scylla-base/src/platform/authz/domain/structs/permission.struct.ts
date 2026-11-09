import { PermissionScope } from './permission-scope.struct.ts';

/** What the UI asks. `permission-map.struct.ts` in `features/access` gives the names of the server. */
export enum Permission {
  UNSPECIFIED = 0,
  CREATE_USER = 1,
  READ_USER = 2,
  UPDATE_USER = 3,
  DELETE_USER = 4,
  LIST_USERS = 5,
  CREATE_WORKSPACE = 6,
  READ_WORKSPACE = 7,
  UPDATE_WORKSPACE = 8,
  DELETE_WORKSPACE = 9,
  LIST_WORKSPACES = 10,
  LIST_WORKSPACE_MEMBERS = 11,
  ADD_WORKSPACE_MEMBER = 12,
  REMOVE_WORKSPACE_MEMBER = 13,
  // 14 was MANAGE_INVITATIONS; do not reuse it.
  LIST_USER_WORKSPACES = 15,
  CREATE_PROJECT = 16,
  READ_PROJECT = 17,
  UPDATE_PROJECT = 18,
  DELETE_PROJECT = 19,
  LIST_PROJECTS = 20,
  LIST_PROJECTS_BY_WORKSPACE = 21,
  LIST_PROJECT_MEMBERS = 22,
  ADD_PROJECT_MEMBER = 23,
  REMOVE_PROJECT_MEMBER = 24,
  LIST_USER_PROJECTS = 25,
  CREATE_PIPELINE = 26,
  READ_PIPELINE = 27,
  UPDATE_PIPELINE = 28,
  DELETE_PIPELINE = 29,
  RUN_PIPELINE = 30,
  EXECUTE_JOB = 31,
  LIST_PIPELINES = 32,
  LIST_PIPELINES_BY_PROJECT = 33,
  LIST_PIPELINES_BY_WORKSPACE = 34,
  CREATE_JOB = 35,
  READ_JOB = 36,
  UPDATE_JOB = 37,
  DELETE_JOB = 38,
  LIST_JOBS = 39,
  LIST_JOBS_BY_PIPELINE = 40,
  LIST_JOBS_BY_PROJECT = 41,
  LIST_JOBS_BY_WORKSPACE = 42,

  READ_JOB_LOGS = 43,
  WRITE_JOB_LOGS = 44,
  WRITE_JOB_STATUS = 45,
  APPEND_JOB_LOG = 46,
  CREATE_APP = 47,
  READ_APP = 48,
  READ_APP_STATS = 49,
  DELETE_APP = 50,
  LIST_APPS_BY_WORKSPACE = 51,
  CREATE_AGENT = 52,
  LIST_AGENTS = 53,
  MANAGE_SYSTEM_GRANTS = 54,
  MANAGE_WORKSPACE_GRANTS = 55,
  MANAGE_PROJECT_GRANTS = 56,
  // 57 was MANAGE_POLICIES; do not reuse it.
  MANAGE_ROLES = 58,
  CREATE_SECRET = 59,
  LIST_SECRETS = 60,
  DELETE_SECRET = 61,
  MANAGE_TRIGGERS = 62,
  MANAGE_WORKSPACE_ROLES = 63,
  UPDATE_SECRET = 64,
  /** Give and take back the role owner of a workspace: its owners only. */
  MANAGE_OWNERS = 65,
  MANAGE_INSTANCE_SETTINGS = 66,
  LIST_ROLES = 67,
  LIST_WORKSPACE_ROLES = 69,
  MANAGE_INSTANCE_ADMINS = 68,
}

const SYSTEM_LEVEL = new Set<Permission>([
  Permission.CREATE_USER,
  Permission.READ_USER,
  Permission.UPDATE_USER,
  Permission.DELETE_USER,
  Permission.LIST_USERS,
  Permission.LIST_USER_WORKSPACES,
  Permission.LIST_USER_PROJECTS,
  Permission.CREATE_WORKSPACE,
  Permission.LIST_WORKSPACES,
  Permission.LIST_PROJECTS,
  Permission.LIST_PIPELINES,
  Permission.LIST_JOBS,
  Permission.MANAGE_SYSTEM_GRANTS,
  Permission.MANAGE_ROLES,
  Permission.MANAGE_INSTANCE_SETTINGS,
  Permission.LIST_ROLES,
  Permission.MANAGE_INSTANCE_ADMINS,
]);

const WORKSPACE_LEVEL = new Set<Permission>([
  Permission.READ_WORKSPACE,
  Permission.MANAGE_OWNERS,
  Permission.UPDATE_WORKSPACE,
  Permission.DELETE_WORKSPACE,
  Permission.LIST_WORKSPACE_MEMBERS,
  Permission.ADD_WORKSPACE_MEMBER,
  Permission.REMOVE_WORKSPACE_MEMBER,
  Permission.CREATE_PROJECT,
  Permission.LIST_PROJECTS_BY_WORKSPACE,
  Permission.LIST_PIPELINES_BY_WORKSPACE,
  Permission.LIST_JOBS_BY_WORKSPACE,
  Permission.CREATE_APP,
  Permission.READ_APP,
  Permission.READ_APP_STATS,
  Permission.DELETE_APP,
  Permission.LIST_APPS_BY_WORKSPACE,
  Permission.CREATE_AGENT,
  Permission.LIST_AGENTS,
  Permission.MANAGE_WORKSPACE_GRANTS,
  Permission.MANAGE_WORKSPACE_ROLES,
  Permission.LIST_WORKSPACE_ROLES,
]);

/**
 * The scope of the resource a permission targets, as the backend's `Permission::resource()`:
 * a user counts as SYSTEM, an app as WORKSPACE. A grant reaches a permission at its own
 * scope or below it, never above.
 */
export const permissionLevel = (permission: Permission): PermissionScope => {
  if (SYSTEM_LEVEL.has(permission)) return PermissionScope.SYSTEM;
  if (WORKSPACE_LEVEL.has(permission)) return PermissionScope.WORKSPACE;
  return PermissionScope.PROJECT;
};
