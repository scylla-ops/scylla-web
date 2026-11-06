import type { MemberRoleEntity } from '@base/features/access';
import {
  missingPermissionIds,
  permissionLabel,
  roleDescription,
  roleName,
  type CatalogArea,
  type RoleEntity,
} from '@base/features/roles';
import { t } from '@scylla/ui/i18n';
import { lockedRole, membershipMessages } from '../messages/membership.messages.ts';
import { memberRoleName } from './member-role-name.ts';
import { OWNER_KEY } from './member-rows.presenter.ts';

/** One row of the checklist of the roles of a member. */
export interface RoleChoice {
  grantName: string;
  name: string;
  hint: string;
  custom: boolean;
  held: boolean;
  /** The caller cannot change this row: `hint` gives the reason. */
  locked: boolean;
}

/** A held role that the list of roles does not give: a role that the caller cannot list. */
const heldOutsideList = (role: MemberRoleEntity, canChangeOwners: boolean): RoleChoice => {
  const locked = role.roleKey === OWNER_KEY && !canChangeOwners;
  return {
    grantName: role.role,
    name: memberRoleName(role),
    hint: locked ? t(membershipMessages.ownerStays) : '',
    custom: false,
    held: true,
    locked,
  };
};

/** The rows keep their order when a role changes, so that a row does not move under a click. */
export const roleChoices = (
  options: readonly RoleEntity[],
  roles: readonly MemberRoleEntity[],
  permissions: ReadonlySet<string> | undefined,
  areas: readonly CatalogArea[],
  canChangeOwners = true,
): RoleChoice[] => {
  const listed = options.map(role => {
    const held = roles.some(one => one.role === role.grantName);
    // `Revoke` has no escalation check, only `manage_owners` for the owner: else only a role to give can lock.
    const ownerLocked = role.grantName === OWNER_KEY && !canChangeOwners;
    const missing = !held && permissions ? missingPermissionIds(role, permissions, areas) : [];
    const lockedHint =
      missing.length > 0
        ? t(lockedRole(missing.map(id => permissionLabel(id, areas)).join(', ')))
        : roleDescription(role);
    return {
      grantName: role.grantName,
      name: roleName(role),
      hint: held && ownerLocked ? t(membershipMessages.ownerStays) : lockedHint,
      custom: !role.builtin,
      held,
      locked: ownerLocked || missing.length > 0,
    };
  });
  const outside = roles
    .filter(role => !options.some(one => one.grantName === role.role))
    .map(role => heldOutsideList(role, canChangeOwners));
  return [...outside, ...listed];
};

/** The roles of a member in one other scope, which change on the page of that scope. */
export interface OtherScope {
  kind: MemberRoleEntity['scopeKind'];
  id: string;
  name: string;
  roles: string[];
}

export const otherScopes = (roles: readonly MemberRoleEntity[]): OtherScope[] => {
  const scopes = new Map<string, OtherScope>();
  for (const role of roles) {
    const scope = scopes.get(role.scopeId) ?? {
      kind: role.scopeKind,
      id: role.scopeId,
      name: role.scopeName,
      roles: [],
    };
    scope.roles.push(memberRoleName(role));
    scopes.set(role.scopeId, scope);
  }
  return [...scopes.values()];
};
