import {
  Permission,
  PermissionScope,
  PrincipalKind,
  type PrincipalEntity,
} from '@platform/authz';
import { roleConfers, type RoleEntity } from './role.entity.ts';

export interface GrantEntity {
  id: string;
  principal: PrincipalEntity;
  /** A grant carries a role and nothing else: a narrower grant is a role with fewer permissions. */
  roleId: string;
  scope: PermissionScope;
  scopeId: string;
}

/**
 * - `not-admitted`: no grant on the organization; the backend rejects the grant.
 * - `cannot-see-projects`: admitted, but cannot read the organization, so the grant would be useless.
 */
export type GrantEligibility = 'eligible' | 'not-admitted' | 'cannot-see-projects';

/** For one organization, whether each user can usefully receive a project grant. */
export const buildGrantEligibility = (
  grants: readonly GrantEntity[],
  roles: readonly RoleEntity[],
  organizationId: string | null,
): ((userId: string) => GrantEligibility) => {
  const roleById = new Map(roles.map(role => [role.id, role]));

  /** Grants on the organization itself: a system grant does not count. */
  const roleIdsByUser = new Map<string, string[]>();
  if (organizationId) {
    for (const grant of grants) {
      if (
        grant.principal.kind !== PrincipalKind.USER ||
        grant.scope !== PermissionScope.ORGANIZATION ||
        grant.scopeId !== organizationId
      ) {
        continue;
      }
      roleIdsByUser.set(grant.principal.id, [
        ...(roleIdsByUser.get(grant.principal.id) ?? []),
        grant.roleId,
      ]);
    }
  }

  return (userId: string): GrantEligibility => {
    const roleIds = roleIdsByUser.get(userId);
    if (!roleIds || roleIds.length === 0) return 'not-admitted';

    const canReadOrganization = roleIds.some(roleId =>
      roleConfers(roleById.get(roleId), Permission.READ_ORGANIZATION),
    );
    return canReadOrganization ? 'eligible' : 'cannot-see-projects';
  };
};
