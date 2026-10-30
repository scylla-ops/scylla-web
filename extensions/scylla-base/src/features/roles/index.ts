/**
 * Role catalog and grants. The authorization primitives
 * (`Permission`, `can`) are in `@platform/authz`. Exports no component.
 */
export type {
  CreateRoleInput,
  GrantableRole,
  RoleEntity,
  UpdateRoleInput,
} from './domain/entities/role.entity.ts';
export type {
  CreateGrantInput,
  GrantEntity,
  RevokeAllAccessInput,
} from './domain/entities/grant.entity.ts';
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
