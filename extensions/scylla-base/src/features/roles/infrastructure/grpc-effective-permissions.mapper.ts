import type { EffectiveScope } from '@base/generated/scylla/authz/v1/role.ts';
import type { EffectivePermissionsEntity, EffectiveScopeEntity } from '@platform/authz';
import * as grpcPermission from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

export function scopeToDomain(grpcScope: EffectiveScope): EffectiveScopeEntity {
  const { scope, scopeId } = grpcPermission.scopeRefToDomain(grpcScope.scope);

  return {
    scope,
    scopeId,
    access: grpcPermission.accessToDomain(grpcScope.access),
  };
}

export function toDomain(grpcScopes: EffectiveScope[]): EffectivePermissionsEntity {
  return {
    scopes: grpcScopes.map(scopeToDomain),
  };
}
