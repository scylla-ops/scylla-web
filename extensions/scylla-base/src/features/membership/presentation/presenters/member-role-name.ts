import type { AccessSourceEntity, MemberRoleEntity } from '@base/features/access';
import { roleName } from '@base/features/roles';
import { i18n } from '@lingui/core';
import { allProjectsRole } from '../messages/membership.messages.ts';

/** The name of a role of a member: a built-in role has a translation. */
export const memberRoleName = (role: Pick<MemberRoleEntity, 'roleKey' | 'roleName'>): string =>
  roleName({ key: role.roleKey, name: role.roleName, builtin: true });

export const sourceRoleName = (source: AccessSourceEntity): string => memberRoleName(source);

export const allProjectsRoleLabel = (roleKey: string): string =>
  i18n._(allProjectsRole(roleName({ key: roleKey, name: roleKey, builtin: true })));
