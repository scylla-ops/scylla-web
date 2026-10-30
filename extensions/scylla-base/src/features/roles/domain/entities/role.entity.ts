import {
  accessConfers,
  holdsPermission,
  type Access,
  type AccessSpec,
  type EffectivePermissions,
  type Permission,
  type PermissionScope,
} from '@platform/authz';
import { carriedBy } from '../structs/permission-catalog.struct.ts';
import { roleNameIssue } from '../structs/role-name.struct.ts';

export enum RoleKind {
  UNSPECIFIED = 0,
  ADMIN = 1,
  AGENT = 2,
  MEMBER = 3,
}

/** `unknown`: an origin arm newer than this build. Never read it as "custom". */
export type RoleOrigin =
  | { kind: 'builtin'; key: string }
  | { kind: 'custom'; ownerOrganizationId?: string }
  | { kind: 'unknown' };

export interface RoleEntity {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  /** The scope kind a grant of this role binds to. */
  scope: PermissionScope;

  origin: RoleOrigin;

  /** `AGENT`: for apps only. `ADMIN`: the builtin owner roles only. */
  kind: RoleKind;

  access: Access;
}

/** A role that can be granted, as a picker shows it: identity and scope only. */
export interface GrantableRole {
  id: string;
  name: string;
  scope: PermissionScope;
  kind: RoleKind;
  description: string;
  /** Set for a role of that organization, absent for a platform role. */
  ownerOrganizationId?: string;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  scope: PermissionScope;
  kind: RoleKind;
  /** Set: a role of this organization. Absent: a platform role. */
  organizationId?: string;
  access: AccessSpec;
}

export interface UpdateRoleInput {
  id: string;
  name?: string;
  description?: string;
  access?: AccessSpec;
}

/** The organization that owns the role; `null` for a platform role (builtin, or made by a system administrator). */
export const roleOwnerOf = (role: RoleEntity): string | null =>
  role.origin.kind === 'custom' ? (role.origin.ownerOrganizationId ?? null) : null;

/**
 * An unknown access arm, or a role missing from the catalog, counts as conferring,
 * unlike `canAccess`: here the question is about someone else's role, and hiding
 * access that exists would mislead an administrator.
 */
export const roleConfers = (role: RoleEntity | undefined, permission: Permission): boolean =>
  !role || role.access.kind === 'unknown' || accessConfers(role.access, permission);

export const updateRole = (role: RoleEntity, changes: Partial<RoleEntity>): RoleEntity => {
  if (changes.name !== undefined && roleNameIssue(changes.name)) {
    throw new Error('Role name cannot be empty');
  }

  return {
    ...role,
    ...changes,
    id: role.id,
  };
};

/**
 * The candidates the author of a role may not tick at `scope`: the backend's escalation rule
 * (`holdsPermission`). A stand-in also needs what it carries.
 */
export const lockedPermissionsOf = (
  candidates: readonly Permission[],
  scope: PermissionScope,
  effective: EffectivePermissions | null,
  organizationId: string | null,
): Set<Permission> =>
  new Set(
    candidates.filter(
      candidate =>
        !carriedBy(scope, candidate).every(permission =>
          holdsPermission(effective, organizationId, permission),
        ),
    ),
  );
