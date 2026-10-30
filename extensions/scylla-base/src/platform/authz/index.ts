/**
 * Read-only authorization: `can` reads a store and never calls the backend.
 * `features/roles` loads the store (`syncMyPermissions`).
 */
export {
  Permission,
  PERMISSION_IMPLICATIONS,
  impliersOf,
  permissionLevel,
} from './domain/structs/permission.struct.ts';
export {
  PermissionScope,
  scopeCovers,
  type AccessScope,
} from './domain/structs/permission-scope.struct.ts';
export { PrincipalKind, type Principal } from './domain/structs/principal.struct.ts';
export { accessConfers, type Access, type AccessSpec } from './domain/structs/access.struct.ts';
export {
  canAccess,
  holdsFullControl,
  holdsPermission,
  type EffectivePermissions,
  type EffectiveScope,
  type PermissionTarget,
} from './domain/structs/effective-permissions.struct.ts';
export { authorizationReady, can } from './presentation/authorization.ts';
export { permissionsStore } from './presentation/stores/permissions.store.ts';
export { default as Can } from './presentation/ui/Can/Can.svelte';
export { default as PermissionDenied } from './presentation/ui/PermissionDenied/PermissionDenied.svelte';
export { default as RequirePermission } from './presentation/ui/RequirePermission/RequirePermission.svelte';
