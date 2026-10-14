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
import type { PermissionVocabularyEntity } from '@base/features/roles/domain/entities/permission-vocabulary.entity.ts';
import type { IGrantServiceClient } from '@base/generated/scylla/authz/v1/grant.client.ts';
import type { IRoleServiceClient } from '@base/generated/scylla/authz/v1/role.client.ts';
import type { EffectivePermissionsEntity, PermissionScope, PrincipalEntity } from '@platform/authz';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import { GrpcRoleMapper } from './grpc-role.mapper.ts';
import { GrpcGrantMapper } from './grpc-grant.mapper.ts';
import { GrpcGrantableRoleMapper } from './grpc-grantable-role.mapper.ts';
import { GrpcEffectivePermissionsMapper } from './grpc-effective-permissions.mapper.ts';
import { GrpcPermissionVocabularyMapper } from './grpc-permission-vocabulary.mapper.ts';
import { GrpcPermissionMapper } from './grpc-permission.mapper.ts';

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
      return response.roles.map(GrpcRoleMapper.toDomain);
    }, 'Failed to list roles.');
  }

  public getRole(id: string): Promise<ScyllaResult<RoleEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.getRole({ roleId: { value: id } }).response;
      return GrpcRoleMapper.toDomain(required(response.role, 'role'));
    }, 'Failed to fetch role.');
  }

  public createRole(role: RoleCreationData): Promise<ScyllaResult<RoleEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.createRole(GrpcRoleMapper.toGrpcCreateRequest(role))
        .response;
      return GrpcRoleMapper.toDomain(required(response.role, 'role'));
    }, 'Failed to create role.');
  }

  public updateRole(role: RoleEntity): Promise<ScyllaResult<RoleEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.updateRole(GrpcRoleMapper.toGrpcUpdateRequest(role))
        .response;
      return GrpcRoleMapper.toDomain(required(response.role, 'role'));
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
        principal: GrpcPermissionMapper.principalRefToGrpc(principal),
      }).response;
      return GrpcEffectivePermissionsMapper.toDomain(response.scopes);
    }, 'Failed to fetch effective permissions.');
  }

  public getMyPermissions(): Promise<ScyllaResult<EffectivePermissionsEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.getMyPermissions({}).response;
      return GrpcEffectivePermissionsMapper.toDomain(response.scopes);
    }, 'Failed to fetch your own permissions.');
  }

  /** No scope: every grant. */
  public listGrants(
    scope?: PermissionScope,
    scopeId?: string,
  ): Promise<ScyllaResult<GrantEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.grants.listGrants({
        scope:
          scope != null ? GrpcPermissionMapper.scopeRefToGrpc(scope, scopeId ?? '') : undefined,
      }).response;
      return response.grants.map(GrpcGrantMapper.toDomain);
    }, 'Failed to list grants.');
  }

  public createGrant(input: CreateGrantInput): Promise<ScyllaResult<GrantEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.grants.createGrant(GrpcGrantMapper.toGrpcCreateRequest(input))
        .response;
      return GrpcGrantMapper.toDomain(required(response.grant, 'grant'));
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
        principal: GrpcPermissionMapper.principalRefToGrpc(principal),
        scope: GrpcPermissionMapper.scopeRefToGrpc(scope, scopeId),
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
        scopeKind: scope != null ? GrpcPermissionMapper.scopeToGrpc(scope) : undefined,
        organizationId: organizationRef(organizationId),
      }).response;
      return response.roles.map(GrpcGrantableRoleMapper.toDomain);
    }, 'Failed to list grantable roles.');
  }

  public listPermissionVocabulary(): Promise<ScyllaResult<PermissionVocabularyEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.roles.listAuthzVocabulary({}).response;
      return GrpcPermissionVocabularyMapper.toDomain(response.actions);
    }, 'Failed to load the permission vocabulary.');
  }
}
