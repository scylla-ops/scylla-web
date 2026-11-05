import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { IRoleServiceClient } from '@base/generated/scylla/access/v1/role_service.client.ts';
import type { Role } from '@base/generated/scylla/access/v1/role_service.ts';
import { platformRef } from '@base/features/access';
import { idValue, required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  CreateRoleInput,
  RoleEntity,
  RoleHolder,
  RoleLevel,
  UpdateRoleInput,
} from '../domain/entities/role.entity.ts';
import type { RoleRepository } from '../domain/repository/role.repository.ts';
import type { CatalogArea } from '../domain/structs/catalog.struct.ts';

const PLATFORM = { kind: platformRef.kind, id: wrapId(platformRef.id) };

const roleToDomain = (role: Role): RoleEntity => ({
  key: role.key,
  name: role.name,
  description: role.description,
  level: role.level as RoleLevel,
  holder: role.holder as RoleHolder,
  grantName: role.grantName,
  builtin: role.builtin,
  fullControl: role.fullControl,
  permissions: role.permissions,
  holderCount: role.holderCount,
  ...(role.workspaceId ? { workspaceId: idValue(role.workspaceId) } : {}),
});

const optionalWorkspace = (workspaceId?: string) =>
  workspaceId ? { workspaceId: wrapId(workspaceId) } : {};

export class DefaultRoleRepository implements RoleRepository {
  constructor(
    private readonly roles: IRoleServiceClient,
    private readonly access: IAccessServiceClient,
  ) {}

  public async catalog(): Promise<CatalogArea[]> {
    const { areas } = await this.roles.listPermissionCatalog({}).response;
    return areas.map(area => ({
      id: area.id,
      level: area.level as RoleLevel,
      machine: area.machine,
      permissions: area.permissions.map(permission => ({
        id: permission.id,
        action: permission.action,
        dependsOn: permission.dependsOn,
        implicit: permission.implicit,
      })),
    }));
  }

  public async list(workspaceId?: string): Promise<RoleEntity[]> {
    const { roles } = await this.roles.listRoles(optionalWorkspace(workspaceId)).response;
    return roles.map(roleToDomain);
  }

  public async get(key: string, workspaceId?: string): Promise<RoleEntity> {
    const { role } = await this.roles.getRole({ key, ...optionalWorkspace(workspaceId) }).response;
    return roleToDomain(required(role, 'role'));
  }

  public async create(input: CreateRoleInput): Promise<RoleEntity> {
    const { role } = await this.roles.createRole({
      name: input.name,
      description: input.description,
      level: input.level,
      holder: input.holder,
      permissions: input.permissions,
      ...optionalWorkspace(input.workspaceId),
    }).response;
    return roleToDomain(required(role, 'role'));
  }

  public async update(input: UpdateRoleInput): Promise<RoleEntity> {
    const { role } = await this.roles.updateRole({
      roleId: wrapId(input.id),
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    }).response;
    return roleToDomain(required(role, 'role'));
  }

  public async remove(id: string): Promise<void> {
    await this.roles.deleteRole({ roleId: wrapId(id) }).response;
  }

  public async changeInstanceRoles(
    userId: string,
    give: string[],
    takeBack: string[],
  ): Promise<void> {
    const actorId = wrapId(userId);
    for (const role of give) {
      await this.access.grant({ object: PLATFORM, role, actorId }).response;
    }
    for (const role of takeBack) {
      await this.access.revoke({ object: PLATFORM, role, actorId }).response;
    }
  }
}
