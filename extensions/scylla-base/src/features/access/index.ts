/**
 * The fixed roles and the access of the server. The authorization primitives (`Permission`,
 * `can`) are in `@platform/authz`; this feature loads their store. Exports no component.
 */
export type { AccessEntryEntity } from './domain/entities/access-entry.entity.ts';
export type {
  AccessSourceEntity,
  MemberAccessEntity,
  MemberEntity,
  MemberRoleEntity,
} from './domain/entities/member.entity.ts';
export {
  platformRef,
  projectRef,
  workspaceRef,
  PLATFORM_ID,
  type ObjectKind,
  type ObjectRef,
} from './domain/structs/object-ref.struct.ts';
export {
  PROJECT_ROLES,
  WORKSPACE_ROLES,
  roleRank,
  rolesOf,
  type FixedRole,
  type ProjectRole,
  type WorkspaceRole,
} from './domain/structs/fixed-role.struct.ts';
export {
  accessMutations,
  accessQueries,
  refreshMyPermissions,
  resetPermissionSync,
  syncMyPermissions,
  ACCESS_QUERY_KEY,
  type RoleChange,
} from './presentation/access.queries.ts';
export { roleLabel } from './presentation/presenters/role-label.presenter.ts';
export { roleDescriptions, roleMessages } from './presentation/messages/access.messages.ts';
