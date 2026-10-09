import type { GrantableRole } from '@base/generated/scylla/authz/v1/grant.ts';
import type { GrantableRoleEntity } from '@base/features/roles/domain/entities/grantable-role.entity.ts';
import { GrpcPermissionMapper } from '@base/features/roles/infrastructure/repository/mappers/grpc-permission.mapper.ts';

export class GrpcGrantableRoleMapper {
  public static toDomain(grpcRole: GrantableRole): GrantableRoleEntity {
    return {
      roleId: grpcRole.roleId?.value ?? '',
      name: grpcRole.name,
      scope: GrpcPermissionMapper.scopeToDomain(grpcRole.scopeKind),
      kind: GrpcPermissionMapper.roleKindToDomain(grpcRole.kind),
      description: grpcRole.description,
      ownerOrganizationId: grpcRole.ownerOrganizationId?.value,
    };
  }
}
