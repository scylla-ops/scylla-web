// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PermissionScope, RoleKind } from '@platform/authz';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { UpdateRoleUseCase } from '../update-role.use-case';
import type { PermissionRepository } from '@base/features/roles/domain/repository/permission.repository.ts';
import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';

const role = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-1',
  name: 'CI runner',
  description: 'runs pipelines',
  scope: PermissionScope.PROJECT,
  origin: { kind: 'custom' },
  kind: RoleKind.MEMBER,
  access: { kind: 'fullControl' },
  ...overrides,
});

describe('UpdateRoleUseCase', () => {
  it('reads the role, applies the changes, and saves the merged result — not the raw input', async () => {
    const getRole = vi.fn().mockResolvedValue(role());
    const updateRole = vi.fn().mockImplementation((r: RoleEntity) => Promise.resolve(r));
    const repository = { getRole, updateRole } as unknown as PermissionRepository;
    const useCase = new UpdateRoleUseCase(repository);

    const result = await useCase.execute({ id: 'role-1', name: 'Renamed' });

    expect(getRole).toHaveBeenCalledWith('role-1');
    expect(updateRole).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'role-1', name: 'Renamed', description: 'runs pipelines' }),
    );
    expect(result.name).toBe('Renamed');
  });

  it('never calls updateRole when getRole fails, and propagates its error', async () => {
    const error = new ScyllaError('boom', { code: 'NOT_FOUND' });
    const getRole = vi.fn().mockRejectedValue(error);
    const updateRole = vi.fn();
    const repository = { getRole, updateRole } as unknown as PermissionRepository;
    const useCase = new UpdateRoleUseCase(repository);

    await expect(useCase.execute({ id: 'missing', name: 'x' })).rejects.toBe(error);

    expect(updateRole).not.toHaveBeenCalled();
  });

  it("never calls the repository's updateRole when the merge itself is invalid (empty name)", async () => {
    const getRole = vi.fn().mockResolvedValue(role());
    const updateRole = vi.fn();
    const repository = { getRole, updateRole } as unknown as PermissionRepository;
    const useCase = new UpdateRoleUseCase(repository);

    await expect(useCase.execute({ id: 'role-1', name: '' })).rejects.toThrow(
      'Role name cannot be empty',
    );

    expect(updateRole).not.toHaveBeenCalled();
  });

  it('propagates a failure from the save call itself', async () => {
    const error = new ScyllaError('conflict', { code: 'ALREADY_EXISTS' });
    const getRole = vi.fn().mockResolvedValue(role());
    const updateRole = vi.fn().mockRejectedValue(error);
    const repository = { getRole, updateRole } as unknown as PermissionRepository;
    const useCase = new UpdateRoleUseCase(repository);

    await expect(useCase.execute({ id: 'role-1', name: 'renamed' })).rejects.toThrow(error);
  });
});
