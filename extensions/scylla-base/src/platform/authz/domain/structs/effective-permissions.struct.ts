import { accessConfers, type Access } from './access.struct.ts';
import { permissionLevel, type Permission } from './permission.struct.ts';
import { PermissionScope, scopeCovers } from './permission-scope.struct.ts';

/** The permissions held at one scope: roles expanded, plus direct grants. */
export interface EffectiveScope {
  scope: PermissionScope;
  /** Empty for the SYSTEM scope. */
  scopeId: string;
  access: Access;
}

/** What a principal may do, as the server computes it from its grants. */
export interface EffectivePermissions {
  scopes: EffectiveScope[];
}

/**
 * What a check is about. A grant covers narrower targets: SYSTEM covers
 * everything, WORKSPACE covers the workspace and its projects.
 */
export interface PermissionTarget {
  workspaceId?: string;
  projectId?: string;
}

/** Client-side UX only: the backend enforces. */
export const canAccess = (
  effective: EffectivePermissions,
  permission: Permission,
  target: PermissionTarget = {},
): boolean =>
  effective.scopes.some(entry => {
    if (!accessConfers(entry.access, permission)) return false;
    if (!scopeCovers(entry.scope, permissionLevel(permission))) return false;
    switch (entry.scope) {
      case PermissionScope.SYSTEM:
        return true;
      case PermissionScope.WORKSPACE:
        return !!target.workspaceId && entry.scopeId === target.workspaceId;
      case PermissionScope.PROJECT:
        return !!target.projectId && entry.scopeId === target.projectId;
      default:
        return false;
    }
  });

/**
 * The backend's escalation rule (`ensure_no_escalation`): an author puts in a role only what it
 * holds through a grant at System, or at the workspace that owns the role (`null` for a
 * platform role). A project grant never counts.
 */
const authoringScopes = (
  effective: EffectivePermissions | null,
  workspaceId: string | null,
): EffectiveScope[] =>
  (effective?.scopes ?? []).filter(
    entry =>
      entry.scope === PermissionScope.SYSTEM ||
      (workspaceId !== null &&
        entry.scope === PermissionScope.WORKSPACE &&
        entry.scopeId === workspaceId),
  );

export const holdsFullControl = (
  effective: EffectivePermissions | null,
  workspaceId: string | null,
): boolean =>
  authoringScopes(effective, workspaceId).some(entry => entry.access.kind === 'fullControl');

export const holdsPermission = (
  effective: EffectivePermissions | null,
  workspaceId: string | null,
  permission: Permission,
): boolean =>
  authoringScopes(effective, workspaceId).some(
    entry =>
      entry.access.kind === 'fullControl' ||
      (entry.access.kind === 'restricted' && entry.access.permissions.includes(permission)),
  );
