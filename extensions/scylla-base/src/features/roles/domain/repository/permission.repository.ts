import type { PermissionScope, Principal, EffectivePermissions } from '@platform/authz';
import type { CreateRoleInput, GrantableRole, RoleEntity } from '../entities/role.entity.ts';
import type {
  CreateGrantInput,
  GrantEntity,
  RevokeAllAccessInput,
} from '../entities/grant.entity.ts';

export interface PermissionRepository {
  /**
   * Set: the platform roles and the roles of that organization (`MANAGE_ORG_ROLES` there).
   * Unset: every role (`MANAGE_ROLES`).
   */
  listRoles(organizationId?: string): Promise<RoleEntity[]>;
  getRole(id: string): Promise<RoleEntity>;
  createRole(role: CreateRoleInput): Promise<RoleEntity>;
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
  ): Promise<GrantableRole[]>;
}
