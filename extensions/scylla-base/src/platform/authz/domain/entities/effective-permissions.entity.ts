import {
  Permission,
  PermissionScope,
  type AccessEntity,
} from '@platform/authz/domain/structs/permission.struct.ts';

/** The permissions held at one scope: roles expanded, plus direct grants. */
export interface EffectiveScopeEntity {
  scope: PermissionScope;
  /** Empty for the SYSTEM scope. */
  scopeId: string;
  access: AccessEntity;
}

export interface EffectivePermissionsEntity {
  scopes: EffectiveScopeEntity[];
}

/**
 * What a check is about. A grant covers narrower targets: SYSTEM covers
 * everything, ORGANIZATION covers the organization and its projects.
 */
export interface PermissionTarget {
  organizationId?: string;
  projectId?: string;
}

/**
 * Holding a listed permission is holding the key. Managing roles implies
 * managing system grants (see `permission-mapping.ts`), also for older roles.
 */
const IMPLIED_BY: Partial<Record<Permission, Permission[]>> = {
  [Permission.MANAGE_SYSTEM_GRANTS]: [Permission.MANAGE_ROLES],
};

const accessConfers = (access: AccessEntity, permission: Permission): boolean => {
  switch (access.kind) {
    case 'fullControl':
      return true;
    case 'restricted':
      return (
        access.permissions.includes(permission) ||
        (IMPLIED_BY[permission] ?? []).some(implier => access.permissions.includes(implier))
      );
    default:
      return false;
  }
};

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
  Permission.MANAGE_INVITATIONS,
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

const reaches = (grantScope: PermissionScope, permission: Permission): boolean => {
  const level = permissionLevel(permission);
  switch (grantScope) {
    case PermissionScope.SYSTEM:
      return true;
    case PermissionScope.ORGANIZATION:
      return level !== PermissionScope.SYSTEM;
    case PermissionScope.PROJECT:
      return level === PermissionScope.PROJECT;
    default:
      return false;
  }
};

/** Client-side UX only: the backend enforces. */
export const canAccess = (
  effective: EffectivePermissionsEntity,
  permission: Permission,
  target: PermissionTarget = {},
): boolean =>
  effective.scopes.some(entry => {
    if (!accessConfers(entry.access, permission) || !reaches(entry.scope, permission)) return false;
    switch (entry.scope) {
      case PermissionScope.SYSTEM:
        return true;
      case PermissionScope.ORGANIZATION:
        return !!target.organizationId && entry.scopeId === target.organizationId;
      case PermissionScope.PROJECT:
        return !!target.projectId && entry.scopeId === target.projectId;
      default:
        return false;
    }
  });
