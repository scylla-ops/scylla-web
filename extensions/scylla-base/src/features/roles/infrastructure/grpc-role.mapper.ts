import type {
  CreateRoleRequest,
  Role,
  UpdateRoleRequest,
} from '@base/generated/scylla/authz/v1/role.ts';
import {
  type CreateRoleInput,
  type RoleEntity,
  RoleKind,
  type RoleOrigin,
} from '@base/features/roles/domain/entities/role.entity.ts';
import * as grpcPermission from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

/** An unknown arm becomes `unknown`, never "custom". */
function originToDomain(grpcRole: Role): RoleOrigin {
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

export function toDomain(grpcRole: Role): RoleEntity {
  return {
    id: grpcRole.roleId?.value ?? '',
    name: grpcRole.name,
    description: grpcRole.description,
    scope: grpcPermission.scopeToDomain(grpcRole.scopeKind),
    origin: originToDomain(grpcRole),
    kind: grpcPermission.roleKindToDomain(grpcRole.kind),
    access: grpcPermission.accessToDomain(grpcRole.access),
  };
}

/** `UNSPECIFIED` is sent as `MEMBER`. Throws on `ADMIN`: the builtin owner roles only. */
export function toGrpcCreateRequest(data: CreateRoleInput): CreateRoleRequest {
  if (data.kind === RoleKind.ADMIN) {
    throw new Error('The admin kind is reserved for the builtin roles.');
  }

  return {
    name: data.name,
    description: data.description,
    scopeKind: grpcPermission.scopeToGrpc(data.scope),
    access: grpcPermission.accessToGrpc(data.access),
    kind: grpcPermission.roleKindToGrpc(
      data.kind === RoleKind.UNSPECIFIED ? RoleKind.MEMBER : data.kind,
    ),
    organizationId: data.organizationId ? { value: data.organizationId } : undefined,
  };
}

export function toGrpcUpdateRequest(role: RoleEntity): UpdateRoleRequest {
  if (role.access.kind === 'unknown') {
    throw new Error(
      'This role uses an access mode this version does not understand; it cannot be updated here.',
    );
  }

  return {
    roleId: { value: role.id },
    name: role.name,
    description: role.description,
    access: grpcPermission.accessToGrpc(role.access),
  };
}
