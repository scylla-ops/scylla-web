import type { EffectiveScope as GrpcEffectiveScope } from '@base/generated/scylla/authz/v1/role.ts';
import type { EffectivePermissions, EffectiveScope } from '@platform/authz';
import * as grpcPermission from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

export function scopeToDomain(grpcScope: GrpcEffectiveScope): EffectiveScope {
  const { scope, scopeId } = grpcPermission.scopeRefToDomain(grpcScope.scope);

  return {
    scope,
    scopeId,
    access: grpcPermission.accessToDomain(grpcScope.access),
  };
}

export function toDomain(grpcScopes: GrpcEffectiveScope[]): EffectivePermissions {
  return {
    scopes: grpcScopes.map(scopeToDomain),
  };
}
