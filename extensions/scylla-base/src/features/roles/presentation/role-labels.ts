import type { RoleEntity } from '../domain/entities/role.entity.ts';
import { permissionsFor, type CatalogArea } from '../domain/structs/catalog.struct.ts';
import { t } from '@scylla/ui/i18n';
import { builtinRoleLabels, countOf, rolesMessages } from './messages/roles.messages.ts';

export const roleName = (role: Pick<RoleEntity, 'key' | 'name' | 'builtin'>): string => {
  const label = role.builtin ? builtinRoleLabels[role.key] : undefined;
  return label ? t(label.name) : role.name;
};

export const roleDescription = (
  role: Pick<RoleEntity, 'key' | 'description' | 'builtin'>,
): string => {
  const label = role.builtin ? builtinRoleLabels[role.key] : undefined;
  return label ? t(label.hint) : role.description;
};

/** "Full control", or "11 of 39". */
export const permissionCount = (role: RoleEntity, areas: readonly CatalogArea[]): string => {
  if (role.fullControl) return t(rolesMessages.fullControl);
  return t(countOf(role.permissions.length, permissionsFor(areas, role.level, role.holder).length));
};
