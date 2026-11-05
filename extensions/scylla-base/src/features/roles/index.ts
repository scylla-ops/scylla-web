export type { RoleEntity, RoleLevel } from './domain/entities/role.entity.ts';
export {
  roleMutations,
  roleQueries,
  type InstanceRolesChange,
} from './presentation/roles.queries.ts';
export { roleDescription, roleName } from './presentation/role-labels.ts';
export { default as OriginTag } from './presentation/ui/components/OriginTag.svelte';
