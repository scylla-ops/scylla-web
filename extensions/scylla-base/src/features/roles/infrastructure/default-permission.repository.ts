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
import type { EffectivePermissions, PermissionScope, Principal } from '@platform/authz';
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

  public async listRoles(organizationId?: string): Promise<RoleEntity[]> {
    const response = await this.roles.listRoles({
      organizationId: organizationRef(organizationId),
    }).response;
    return response.roles.map(grpcRole.toDomain);
  }

  public async getRole(id: string): Promise<RoleEntity> {
    const response = await this.roles.getRole({ roleId: { value: id } }).response;
    return grpcRole.toDomain(required(response.role, 'role'));
  }

  public async createRole(role: RoleCreationData): Promise<RoleEntity> {
    const response = await this.roles.createRole(grpcRole.toGrpcCreateRequest(role)).response;
    return grpcRole.toDomain(required(response.role, 'role'));
  }

  public async updateRole(role: RoleEntity): Promise<RoleEntity> {
    const response = await this.roles.updateRole(grpcRole.toGrpcUpdateRequest(role)).response;
    return grpcRole.toDomain(required(response.role, 'role'));
  }

  public async deleteRole(id: string): Promise<void> {
    await this.roles.deleteRole({ roleId: { value: id } }).response;
  }

  public async getEffectivePermissions(
    principal: Principal,
  ): Promise<EffectivePermissions> {
    const response = await this.roles.getEffectivePermissions({
      principal: grpcPermission.principalRefToGrpc(principal),
    }).response;
    return grpcEffectivePermissions.toDomain(response.scopes);
  }

  public async getMyPermissions(): Promise<EffectivePermissions> {
    const response = await this.roles.getMyPermissions({}).response;
    return grpcEffectivePermissions.toDomain(response.scopes);
  }

  /** No scope: every grant. */
  public async listGrants(scope?: PermissionScope, scopeId?: string): Promise<GrantEntity[]> {
    const response = await this.grants.listGrants({
      scope: scope != null ? grpcPermission.scopeRefToGrpc(scope, scopeId ?? '') : undefined,
    }).response;
    return response.grants.map(grpcGrant.toDomain);
  }

  public async createGrant(input: CreateGrantInput): Promise<GrantEntity> {
    const response = await this.grants.createGrant(grpcGrant.toGrpcCreateRequest(input)).response;
    return grpcGrant.toDomain(required(response.grant, 'grant'));
  }

  public async revokeGrant(id: string): Promise<void> {
    await this.grants.revokeGrant({ grantId: { value: id } }).response;
  }

  /** A `uint64` count of grants: narrowing to `number` is safe. */
  public async revokeAllAccess({
    principal,
    scope,
    scopeId,
  }: RevokeAllAccessInput): Promise<number> {
    const response = await this.grants.revokeAllAccess({
      principal: grpcPermission.principalRefToGrpc(principal),
      scope: grpcPermission.scopeRefToGrpc(scope, scopeId),
    }).response;
    return Number(response.revoked);
  }

  public async listGrantableRoles(
    scope?: PermissionScope,
    organizationId?: string,
  ): Promise<GrantableRoleEntity[]> {
    const response = await this.grants.listGrantableRoles({
      scopeKind: scope != null ? grpcPermission.scopeToGrpc(scope) : undefined,
      organizationId: organizationRef(organizationId),
    }).response;
    return response.roles.map(grpcGrantableRole.toDomain);
  }

  public async listPermissionVocabulary(): Promise<PermissionVocabulary> {
    const response = await this.roles.listAuthzVocabulary({}).response;
    return grpcPermissionVocabulary.toDomain(response.actions);
  }
}
