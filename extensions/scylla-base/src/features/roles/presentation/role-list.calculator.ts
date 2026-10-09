import { PermissionScope } from '@platform/authz';
import { roleOwnerOf, type RoleEntity } from '../domain/entities/role.entity.ts';
import type { GrantEntity } from '../domain/entities/grant.entity.ts';

export interface OwnerGroups {
  /** Owned by the organization: only it sees and grants them. */
  organization: RoleEntity[];
  /** No owner: the builtins and the roles of the system administrators. */
  platform: RoleEntity[];
}

/** By name, as a reader looks for a role: the backend lists them in no order. */
export const sortRolesByName = (roles: readonly RoleEntity[]): RoleEntity[] =>
  [...roles].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

/**
 * What an organization sees, split by owner and sorted by name. A role of another organization
 * is dropped, and so is a SYSTEM-scope platform role: no grant in an organization binds it.
 */
export const groupRolesByOwner = (
  roles: readonly RoleEntity[],
  organizationId: string | null,
): OwnerGroups => {
  const organization: RoleEntity[] = [];
  const platform: RoleEntity[] = [];
  for (const role of roles) {
    const owner = roleOwnerOf(role);
    if (owner === null) {
      if (role.scope !== PermissionScope.SYSTEM) platform.push(role);
    } else if (owner === organizationId) {
      organization.push(role);
    }
  }
  return { organization: sortRolesByName(organization), platform: sortRolesByName(platform) };
};

/** Holders, not grants: a user who holds a role on two projects counts once. */
export const countHoldersByRole = (grants: readonly GrantEntity[]): Map<string, number> => {
  const holders = new Map<string, Set<string>>();
  for (const grant of grants) {
    const principals = holders.get(grant.roleId) ?? new Set<string>();
    principals.add(`${grant.principal.kind}:${grant.principal.id}`);
    holders.set(grant.roleId, principals);
  }
  return new Map([...holders].map(([roleId, principals]) => [roleId, principals.size]));
};
