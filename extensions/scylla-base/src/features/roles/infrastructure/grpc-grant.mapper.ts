import type { CreateGrantRequest, Grant } from '@base/generated/scylla/authz/v1/grant.ts';
import type { GrantEntity } from '@base/features/roles/domain/entities/grant.entity.ts';
import type { CreateGrantInput } from '@base/features/roles/domain/repository/permission.repository.ts';
import * as grpcPermission from '@base/features/roles/infrastructure/grpc-permission.mapper.ts';

export function toDomain(grpcGrant: Grant): GrantEntity {
  const { scope, scopeId } = grpcPermission.scopeRefToDomain(grpcGrant.scope);

  return {
    id: grpcGrant.grantId?.value ?? '',
    principal: grpcPermission.principalRefToDomain(grpcGrant.principal),
    roleId: grpcGrant.role?.value ?? '',
    scope,
    scopeId,
  };
}

/** Throws when the principal or the scope is unspecified. */
export function toGrpcCreateRequest(input: CreateGrantInput): CreateGrantRequest {
  return {
    principal: grpcPermission.principalRefToGrpc(input.principal),
    scope: grpcPermission.scopeRefToGrpc(input.scope, input.scopeId),
    role: { value: input.roleId },
  };
}
