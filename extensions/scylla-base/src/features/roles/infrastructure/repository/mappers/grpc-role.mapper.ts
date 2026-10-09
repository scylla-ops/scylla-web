import type {
  CreateRoleRequest,
  Role,
  UpdateRoleRequest,
} from '@base/generated/scylla/authz/v1/role.ts';
import type {
  RoleCreationData,
  RoleEntity,
  RoleOrigin,
} from '@base/features/roles/domain/entities/role.entity.ts';
import { RoleKind } from '@platform/authz';
import { GrpcPermissionMapper } from '@base/features/roles/infrastructure/repository/mappers/grpc-permission.mapper.ts';

export class GrpcRoleMapper {
  /** An unknown arm becomes `unknown`, never "custom". */
  private static originToDomain(grpcRole: Role): RoleOrigin {
    switch (grpcRole.origin.oneofKind) {
      case 'builtin':
        return { kind: 'builtin', key: grpcRole.origin.builtin.key };
      case 'custom':
        return {
          kind: 'custom',
          ownerOrganizationId: grpcRole.origin.custom.ownerOrganizationId?.value,
        };
      default:
        return { kind: 'unknown' };
    }
  }

  public static toDomain(grpcRole: Role): RoleEntity {
    return {
      id: grpcRole.roleId?.value ?? '',
      name: grpcRole.name,
      description: grpcRole.description,
      scope: GrpcPermissionMapper.scopeToDomain(grpcRole.scopeKind),
      origin: GrpcRoleMapper.originToDomain(grpcRole),
      kind: GrpcPermissionMapper.roleKindToDomain(grpcRole.kind),
      access: GrpcPermissionMapper.accessToDomain(grpcRole.access),
    };
  }

  /** `UNSPECIFIED` is sent as `MEMBER`. Throws on `ADMIN`: the builtin owner roles only. */
  public static toGrpcCreateRequest(data: RoleCreationData): CreateRoleRequest {
    if (data.kind === RoleKind.ADMIN) {
      throw new Error('The admin kind is reserved for the builtin roles.');
    }

    return {
      name: data.name,
      description: data.description,
      scopeKind: GrpcPermissionMapper.scopeToGrpc(data.scope),
      access: GrpcPermissionMapper.accessToGrpc(data.access),
      kind: GrpcPermissionMapper.roleKindToGrpc(
        data.kind === RoleKind.UNSPECIFIED ? RoleKind.MEMBER : data.kind,
      ),
      organizationId: data.organizationId ? { value: data.organizationId } : undefined,
    };
  }

  public static toGrpcUpdateRequest(role: RoleEntity): UpdateRoleRequest {
    if (role.access.kind === 'unknown') {
      throw new Error(
        'This role uses an access mode this version does not understand; it cannot be updated here.',
      );
    }

    return {
      roleId: { value: role.id },
      name: role.name,
      description: role.description,
      access: GrpcPermissionMapper.accessToGrpc(role.access),
    };
  }
}
