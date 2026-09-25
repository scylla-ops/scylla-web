import type { EffectiveScope } from '@base/generated/scylla/authz/v1/role.ts';
import type { EffectivePermissionsEntity, EffectiveScopeEntity, } from '@platform/authz';
import { GrpcPermissionMapper } from '@base/features/roles/infrastructure/repository/mappers/grpc-permission.mapper.ts';

export class GrpcEffectivePermissionsMapper {
  public static scopeToDomain(grpcScope: EffectiveScope): EffectiveScopeEntity {
    const { scope, scopeId } = GrpcPermissionMapper.scopeRefToDomain(grpcScope.scope);

    return {
      scope,
      scopeId,
      access: GrpcPermissionMapper.accessToDomain(grpcScope.access),
    };
  }

  public static toDomain(grpcScopes: EffectiveScope[]): EffectivePermissionsEntity {
    return {
      scopes: grpcScopes.map(GrpcEffectivePermissionsMapper.scopeToDomain),
    };
  }
}
