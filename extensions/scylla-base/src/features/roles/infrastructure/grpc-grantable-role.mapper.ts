import type { GrantableRole } from '@base/generated/scylla/authz/v1/grant.ts';
import type { GrantableRoleEntity } from '@base/features/roles/domain/entities/grantable-role.entity.ts';
import * as grpcPermission from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

export function toDomain(grpcRole: GrantableRole): GrantableRoleEntity {
  return {
    roleId: grpcRole.roleId?.value ?? '',
    name: grpcRole.name,
    scope: grpcPermission.scopeToDomain(grpcRole.scopeKind),
    kind: grpcPermission.roleKindToDomain(grpcRole.kind),
    description: grpcRole.description,
    ownerOrganizationId: grpcRole.ownerOrganizationId?.value,
  };
}
