import type { PermissionRepository } from '@base/features/roles/domain/repository/permission.repository.ts';
import {
  type RoleEntity,
  type UpdateRoleInput,
  updateRole,
} from '@base/features/roles/domain/entities/role.entity.ts';

export class UpdateRoleUseCase {
  constructor(private readonly _repository: PermissionRepository) {}

  public async execute(input: UpdateRoleInput): Promise<RoleEntity> {
    const role = await this._repository.getRole(input.id);
    return this._repository.updateRole(updateRole(role, input));
  }
}
