import { PermissionScope } from './permission-scope.struct.ts';

/**
 * The wire vocabulary, value for value. The role editor offers a smaller
 * subset: see `permission-catalog.struct.ts` in `features/roles`.
 */
export enum Permission {
  UNSPECIFIED = 0,
  CREATE_USER = 1,
  READ_USER = 2,
  UPDATE_USER = 3,
  DELETE_USER = 4,
  LIST_USERS = 5,
  CREATE_ORGANIZATION = 6,
  READ_ORGANIZATION = 7,
  UPDATE_ORGANIZATION = 8,
  DELETE_ORGANIZATION = 9,
  LIST_ORGANIZATIONS = 10,
  LIST_ORGANIZATION_MEMBERS = 11,
  ADD_ORGANIZATION_MEMBER = 12,
  REMOVE_ORGANIZATION_MEMBER = 13,
  // 14 was MANAGE_INVITATIONS; do not reuse it.
  LIST_USER_ORGANIZATIONS = 15,
  CREATE_PROJECT = 16,
  READ_PROJECT = 17,
  UPDATE_PROJECT = 18,
  DELETE_PROJECT = 19,
  LIST_PROJECTS = 20,
  LIST_PROJECTS_BY_ORGANIZATION = 21,
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
  LIST_PIPELINES_BY_ORGANIZATION = 34,
  CREATE_JOB = 35,
  READ_JOB = 36,
  UPDATE_JOB = 37,
  DELETE_JOB = 38,
  LIST_JOBS = 39,
  LIST_JOBS_BY_PIPELINE = 40,
  LIST_JOBS_BY_PROJECT = 41,
  LIST_JOBS_BY_ORGANIZATION = 42,

  READ_JOB_LOGS = 43,
  WRITE_JOB_LOGS = 44,
  WRITE_JOB_STATUS = 45,
  APPEND_JOB_LOG = 46,
  CREATE_APP = 47,
  READ_APP = 48,
  READ_APP_STATS = 49,
  DELETE_APP = 50,
  LIST_APPS_BY_ORGANIZATION = 51,
  CREATE_AGENT = 52,
  LIST_AGENTS = 53,
  MANAGE_SYSTEM_GRANTS = 54,
  MANAGE_ORG_GRANTS = 55,
  MANAGE_PROJECT_GRANTS = 56,
  // 57 was MANAGE_POLICIES; do not reuse it.
  MANAGE_ROLES = 58,
  CREATE_SECRET = 59,
  LIST_SECRETS = 60,
  DELETE_SECRET = 61,
  MANAGE_TRIGGERS = 62,
  MANAGE_ORG_ROLES = 63,
  UPDATE_SECRET = 64,
}

/**
 * Holding `by` is holding `permission`, also for the roles made before `permission` existed:
 * who writes roles hands them out. The role editor writes the implied permission too
 * (`permission-catalog.struct.ts` in `features/roles`).
 */
export const PERMISSION_IMPLICATIONS: readonly { permission: Permission; by: Permission }[] = [
  { permission: Permission.MANAGE_SYSTEM_GRANTS, by: Permission.MANAGE_ROLES },
];

/** The permissions that confer `permission` without listing it. */
export const impliersOf = (permission: Permission): Permission[] =>
  PERMISSION_IMPLICATIONS.filter(entry => entry.permission === permission).map(entry => entry.by);

const SYSTEM_LEVEL = new Set<Permission>([
  Permission.CREATE_USER,
  Permission.READ_USER,
  Permission.UPDATE_USER,
  Permission.DELETE_USER,
  Permission.LIST_USERS,
  Permission.LIST_USER_ORGANIZATIONS,
  Permission.LIST_USER_PROJECTS,
  Permission.CREATE_ORGANIZATION,
  Permission.LIST_ORGANIZATIONS,
  Permission.LIST_PROJECTS,
  Permission.LIST_PIPELINES,
  Permission.CREATE_JOB,
  Permission.LIST_JOBS,
  Permission.MANAGE_SYSTEM_GRANTS,
  Permission.MANAGE_ROLES,
]);

const ORGANIZATION_LEVEL = new Set<Permission>([
  Permission.READ_ORGANIZATION,
  Permission.UPDATE_ORGANIZATION,
  Permission.DELETE_ORGANIZATION,
  Permission.LIST_ORGANIZATION_MEMBERS,
  Permission.ADD_ORGANIZATION_MEMBER,
  Permission.REMOVE_ORGANIZATION_MEMBER,
  Permission.CREATE_PROJECT,
  Permission.LIST_PROJECTS_BY_ORGANIZATION,
  Permission.LIST_PIPELINES_BY_ORGANIZATION,
  Permission.LIST_JOBS_BY_ORGANIZATION,
  Permission.CREATE_APP,
  Permission.READ_APP,
  Permission.READ_APP_STATS,
  Permission.DELETE_APP,
  Permission.LIST_APPS_BY_ORGANIZATION,
  Permission.CREATE_AGENT,
  Permission.LIST_AGENTS,
  Permission.MANAGE_ORG_GRANTS,
  Permission.MANAGE_ORG_ROLES,
]);

/**
 * The scope of the resource a permission targets, as the backend's `Permission::resource()`:
 * a user counts as SYSTEM, an app as ORGANIZATION. A grant reaches a permission at its own
 * scope or below it, never above.
 */
export const permissionLevel = (permission: Permission): PermissionScope => {
  if (SYSTEM_LEVEL.has(permission)) return PermissionScope.SYSTEM;
  if (ORGANIZATION_LEVEL.has(permission)) return PermissionScope.ORGANIZATION;
  return PermissionScope.PROJECT;
};
