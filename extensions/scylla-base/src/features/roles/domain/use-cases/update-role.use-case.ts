import type { PermissionRepository } from '@base/features/roles/domain/repository/permission.repository.ts';
import { type RoleEntity, updateRole } from '@base/features/roles/domain/entities/role.entity.ts';
import type { AccessSpec } from '@platform/authz';

export interface UpdateRoleInput {
  id: string;
  name?: string;
  description?: string;
  access?: AccessSpec;
}

export class UpdateRoleUseCase {
  constructor(private readonly _repository: PermissionRepository) {}

  public async execute(input: UpdateRoleInput): Promise<RoleEntity> {
    const role = await this._repository.getRole(input.id);
    return this._repository.updateRole(updateRole(role, input));
  }
}
