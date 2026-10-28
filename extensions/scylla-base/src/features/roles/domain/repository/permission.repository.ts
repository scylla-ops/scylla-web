import type { PermissionScope, Principal, EffectivePermissions } from '@platform/authz';
import type {
  RoleCreationData,
  RoleEntity,
} from '@base/features/roles/domain/entities/role.entity.ts';
import type {
  GrantEntity,
} from '@base/features/roles/domain/entities/grant.entity.ts';
import type { GrantableRoleEntity } from '@base/features/roles/domain/entities/grantable-role.entity.ts';

export interface CreateGrantInput {
  principal: Principal;
  roleId: string;
  scope: PermissionScope;
  scopeId: string;
}

export interface RevokeAllAccessInput {
  principal: Principal;
  scope: PermissionScope;
  scopeId: string;
}

export interface PermissionRepository {
  /**
   * Set: the platform roles and the roles of that organization (`MANAGE_ORG_ROLES` there).
   * Unset: every role (`MANAGE_ROLES`).
   */
  listRoles(organizationId?: string): Promise<RoleEntity[]>;
  getRole(id: string): Promise<RoleEntity>;
  createRole(role: RoleCreationData): Promise<RoleEntity>;
  updateRole(role: RoleEntity): Promise<RoleEntity>;
  deleteRole(id: string): Promise<void>;

  getEffectivePermissions(principal: Principal): Promise<EffectivePermissions>;
  /** Needs no permission, unlike the above. */
  getMyPermissions(): Promise<EffectivePermissions>;

  listGrants(scope?: PermissionScope, scopeId?: string): Promise<GrantEntity[]>;
  createGrant(input: CreateGrantInput): Promise<GrantEntity>;
  revokeGrant(id: string): Promise<void>;
  /**
   * Clears every grant of `principal` at a scope and beneath it, and returns how many.
   * Membership is derived from grants: the project grants must go too.
   */
  revokeAllAccess(input: RevokeAllAccessInput): Promise<number>;
  /** Unset `organizationId`: the platform roles, no permission. Set: its roles too (`READ_ORGANIZATION`). */
  listGrantableRoles(
    scope?: PermissionScope,
    organizationId?: string,
  ): Promise<GrantableRoleEntity[]>;
}
