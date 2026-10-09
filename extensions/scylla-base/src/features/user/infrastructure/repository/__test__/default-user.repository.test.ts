// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type { User } from '@base/generated/scylla/user/v1/user.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { UserRemoteDataSource } from '../data-sources/user-remote.data-source.ts';
import { DefaultUserRepository } from '../default-user.repository.ts';

const wireUser: User = {
  userId: { value: 'user-1' },
  username: 'ada',
  email: { value: 'ada@example.com' },
  isActive: true,
};

const dataSource = (): UserRemoteDataSource => ({
  getAll: vi.fn(),
  getById: vi.fn().mockResolvedValue(ScyllaResult.success(wireUser)),
  getMe: vi.fn().mockResolvedValue(ScyllaResult.success(wireUser)),
  create: vi.fn().mockResolvedValue(ScyllaResult.success(wireUser)),
  update: vi.fn().mockResolvedValue(ScyllaResult.success(wireUser)),
  delete: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
  setActive: vi.fn().mockResolvedValue(ScyllaResult.success({ ...wireUser, isActive: false })),
  changePassword: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
  sendPasswordReset: vi.fn().mockResolvedValue(ScyllaResult.success(PasswordResetDelivery.MAIL)),
  revokeSessions: vi.fn().mockResolvedValue(ScyllaResult.success(3)),
  deleteAccount: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
  listAccess: vi.fn().mockResolvedValue(
    ScyllaResult.success([
      {
        grantId: { value: 'grant-1' },
        scope: { scope: { oneofKind: 'system', system: {} } },
        organizationName: '',
        projectName: '',
        roleId: { value: 'system-admin' },
        roleName: 'System admin',
      },
    ]),
  ),
});

describe('DefaultUserRepository', () => {
  it('reads the account of the session', async () => {
    const result = await new DefaultUserRepository(dataSource()).getMe();

    expect(result.unwrap()).toMatchObject({ userId: 'user-1', email: 'ada@example.com' });
  });

  it('sends the email and the display name of a new user', async () => {
    const source = dataSource();

    await new DefaultUserRepository(source).create({
      email: 'ada@example.com',
      username: 'ada',
      password: 'hunter22',
      displayName: 'Ada',
    });

    expect(source.create).toHaveBeenCalledWith({
      email: { value: 'ada@example.com' },
      username: 'ada',
      password: 'hunter22',
      displayName: 'Ada',
    });
  });

  it('sends only the changed fields of an update', async () => {
    const source = dataSource();

    await new DefaultUserRepository(source).update({ userId: 'user-1', displayName: 'Ada' });

    expect(source.update).toHaveBeenCalledWith({ userId: { value: 'user-1' }, displayName: 'Ada' });
  });

  it('gives the new status of the user', async () => {
    const result = await new DefaultUserRepository(dataSource()).setActive('user-1', false);

    expect(result.unwrap().isActive).toBe(false);
  });

  it('gives the delivery of a reset link in domain terms', async () => {
    const result = await new DefaultUserRepository(dataSource()).sendPasswordReset('user-1');

    expect(result.unwrap()).toBe('mail');
  });

  it('gives the number of revoked sessions', async () => {
    const result = await new DefaultUserRepository(dataSource()).revokeSessions('user-1');

    expect(result.unwrap()).toBe(3);
  });

  it('passes the passwords through', async () => {
    const source = dataSource();
    const repository = new DefaultUserRepository(source);

    await repository.changePassword('old-password', 'new-password');
    await repository.deleteAccount('old-password');

    expect(source.changePassword).toHaveBeenCalledWith('old-password', 'new-password');
    expect(source.deleteAccount).toHaveBeenCalledWith('old-password');
  });

  it('maps every grant of the user', async () => {
    const result = await new DefaultUserRepository(dataSource()).listAccess('user-1');

    expect(result.unwrap()).toEqual([
      expect.objectContaining({ grantId: 'grant-1', scope: 'system', roleName: 'System admin' }),
    ]);
  });
});
