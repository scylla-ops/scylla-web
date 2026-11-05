export type { RoleEntity, RoleLevel } from './domain/entities/role.entity.ts';
export {
  roleMutations,
  roleQueries,
  type InstanceRolesChange,
} from './presentation/roles.queries.ts';
export { roleDescription, roleName } from './presentation/role-labels.ts';
export { permissionLabel } from './presentation/messages/roles.messages.ts';
export { ACTIONS, missingPermissionIds, type CatalogArea } from './domain/structs/catalog.struct.ts';
export { actionLabels, areaLabels } from './presentation/messages/roles.messages.ts';
export { default as OriginTag } from './presentation/ui/components/OriginTag.svelte';
