/**
 * Role catalog, grants and permission vocabulary. The authorization primitives
 * (`Permission`, `can`) are in `@platform/authz`. Exports no component.
 */
export type { RoleEntity, RoleCreationData } from './domain/entities/role.entity.ts';
export type { GrantEntity } from './domain/entities/grant.entity.ts';
export type { GrantableRoleEntity } from './domain/entities/grantable-role.entity.ts';
export { RoleKind, roleConfers } from './domain/entities/role.entity.ts';
export { humanizeRoleId } from './presentation/presenters/role-label.presenter.ts';
export { scopeLabelOf } from './presentation/presenters/permission-label.presenter.ts';
export {
  roleQueries,
  roleMutations,
  grantMutations,
  refreshMyPermissions,
  syncMyPermissions,
  resetPermissionSync,
  ROLES_QUERY_KEY,
  ORGANIZATION_ROLES_QUERY_KEY,
  GRANTS_QUERY_KEY,
  GRANTABLE_ROLES_QUERY_KEY,
} from './presentation/roles.queries.ts';
