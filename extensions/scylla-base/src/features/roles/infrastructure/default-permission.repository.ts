import type {
  CreateGrantInput,
  PermissionRepository,
  RevokeAllAccessInput,
} from '@base/features/roles/domain/repository/permission.repository.ts';
import type {
  RoleCreationData,
  RoleEntity,
} from '@base/features/roles/domain/entities/role.entity.ts';
import type { GrantEntity } from '@base/features/roles/domain/entities/grant.entity.ts';
import type { GrantableRoleEntity } from '@base/features/roles/domain/entities/grantable-role.entity.ts';
import type { PermissionVocabulary } from '@base/features/roles/domain/structs/permission-vocabulary.struct.ts';
import type { IGrantServiceClient } from '@base/generated/scylla/authz/v1/grant.client.ts';
import type { IRoleServiceClient } from '@base/generated/scylla/authz/v1/role.client.ts';
import type { EffectivePermissionsEntity, PermissionScope, PrincipalEntity } from '@platform/authz';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import * as grpcRole from './grpc-role.mapper.ts';
import * as grpcGrant from './grpc-grant.mapper.ts';
import * as grpcGrantableRole from './grpc-grantable-role.mapper.ts';
import * as grpcEffectivePermissions from './grpc-effective-permissions.mapper.ts';
import * as grpcPermissionVocabulary from './grpc-permission-vocabulary.mapper.ts';
import * as grpcPermission from './grpc-permission.mapper.ts';

/** The backend always fills the wrapped entity on success: a missing one is a protocol error. */
const required = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`The server response carried no ${what}.`);
  return value;
};

const organizationRef = (organizationId?: string) =>
  organizationId ? { value: organizationId } : undefined;

export class DefaultPermissionRepository implements PermissionRepository {
  constructor(
    private readonly roles: IRoleServiceClient,
    private readonly grants: IGrantServiceClient,
  ) {}

  public listRoles(organizationId?: string): Promise<ScyllaResult<RoleEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.listRoles({
        organizationId: organizationRef(organizationId),
      }).response;
      return response.roles.map(grpcRole.toDomain);
    }, 'Failed to list roles.');
  }

  public getRole(id: string): Promise<ScyllaResult<RoleEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.getRole({ roleId: { value: id } }).response;
      return grpcRole.toDomain(required(response.role, 'role'));
    }, 'Failed to fetch role.');
  }

  public createRole(role: RoleCreationData): Promise<ScyllaResult<RoleEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.createRole(grpcRole.toGrpcCreateRequest(role)).response;
      return grpcRole.toDomain(required(response.role, 'role'));
    }, 'Failed to create role.');
  }

  public updateRole(role: RoleEntity): Promise<ScyllaResult<RoleEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.updateRole(grpcRole.toGrpcUpdateRequest(role)).response;
      return grpcRole.toDomain(required(response.role, 'role'));
    }, 'Failed to update role.');
  }

  public deleteRole(id: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.roles.deleteRole({ roleId: { value: id } }).response;
    }, 'Failed to delete role.');
  }

  public getEffectivePermissions(
    principal: PrincipalEntity,
  ): Promise<ScyllaResult<EffectivePermissionsEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.getEffectivePermissions({
        principal: grpcPermission.principalRefToGrpc(principal),
      }).response;
      return grpcEffectivePermissions.toDomain(response.scopes);
    }, 'Failed to fetch effective permissions.');
  }

  public getMyPermissions(): Promise<ScyllaResult<EffectivePermissionsEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.getMyPermissions({}).response;
      return grpcEffectivePermissions.toDomain(response.scopes);
    }, 'Failed to fetch your own permissions.');
  }

  /** No scope: every grant. */
  public listGrants(
    scope?: PermissionScope,
    scopeId?: string,
  ): Promise<ScyllaResult<GrantEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.grants.listGrants({
        scope: scope != null ? grpcPermission.scopeRefToGrpc(scope, scopeId ?? '') : undefined,
      }).response;
      return response.grants.map(grpcGrant.toDomain);
    }, 'Failed to list grants.');
  }

  public createGrant(input: CreateGrantInput): Promise<ScyllaResult<GrantEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.grants.createGrant(grpcGrant.toGrpcCreateRequest(input)).response;
      return grpcGrant.toDomain(required(response.grant, 'grant'));
    }, 'Failed to create grant.');
  }

  public revokeGrant(id: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.grants.revokeGrant({ grantId: { value: id } }).response;
    }, 'Failed to revoke grant.');
  }

  /** A `uint64` count of grants: narrowing to `number` is safe. */
  public revokeAllAccess({
    principal,
    scope,
    scopeId,
  }: RevokeAllAccessInput): Promise<ScyllaResult<number>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.grants.revokeAllAccess({
        principal: grpcPermission.principalRefToGrpc(principal),
        scope: grpcPermission.scopeRefToGrpc(scope, scopeId),
      }).response;
      return Number(response.revoked);
    }, 'Failed to revoke access.');
  }

  public listGrantableRoles(
    scope?: PermissionScope,
    organizationId?: string,
  ): Promise<ScyllaResult<GrantableRoleEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.grants.listGrantableRoles({
        scopeKind: scope != null ? grpcPermission.scopeToGrpc(scope) : undefined,
        organizationId: organizationRef(organizationId),
      }).response;
      return response.roles.map(grpcGrantableRole.toDomain);
    }, 'Failed to list grantable roles.');
  }

  public listPermissionVocabulary(): Promise<ScyllaResult<PermissionVocabulary>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.listAuthzVocabulary({}).response;
      return grpcPermissionVocabulary.toDomain(response.actions);
    }, 'Failed to load the permission vocabulary.');
  }
}
