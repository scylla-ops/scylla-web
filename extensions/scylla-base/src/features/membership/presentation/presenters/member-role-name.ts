import type { AccessSourceEntity, MemberRoleEntity } from '@base/features/access';
import { roleName } from '@base/features/roles';
import { i18n } from '@lingui/core';
import { membershipMessages } from '../messages/membership.messages.ts';
import { OWNER_KEY } from './member-rows.presenter.ts';

/** The name of a role of a member: a built-in role has a translation. */
export const memberRoleName = (role: Pick<MemberRoleEntity, 'roleKey' | 'roleName'>): string =>
  role.roleKey === OWNER_KEY
    ? i18n._(membershipMessages.owner)
    : roleName({ key: role.roleKey, name: role.roleName, builtin: true });

export const sourceRoleName = (source: AccessSourceEntity): string => memberRoleName(source);
