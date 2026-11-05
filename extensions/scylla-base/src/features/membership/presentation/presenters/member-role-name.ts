import type { AccessSourceEntity, MemberRoleEntity } from '@base/features/access';
import { roleName } from '@base/features/roles';

/** The name of a role of a member: a built-in role has a translation. */
export const memberRoleName = (role: Pick<MemberRoleEntity, 'roleKey' | 'roleName'>): string =>
  roleName({ key: role.roleKey, name: role.roleName, builtin: true });

export const sourceRoleName = (source: AccessSourceEntity): string => memberRoleName(source);
