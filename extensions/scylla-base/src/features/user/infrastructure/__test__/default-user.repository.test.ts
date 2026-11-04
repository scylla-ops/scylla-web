// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { User } from '@base/generated/scylla/accounts/v1/user.ts';
import type { IProfileServiceClient } from '@base/generated/scylla/accounts/v1/profile_service.client.ts';
import type { IUserAdminServiceClient } from '@base/generated/scylla/accounts/v1/user_admin_service.client.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultUserRepository } from '../default-user.repository.ts';

const wireUser: User = {
  id: { value: 'user-1' },
  handle: 'ada',
  email: 'ada@example.com',
  displayName: 'Ada',
  status: 'active',
  instanceAdmin: false,
};

const sessions = [
  { id: { value: 's-1' }, methods: [], userAgent: '', ipAddress: '', current: true },
  { id: { value: 's-2' }, methods: [], userAgent: '', ipAddress: '', current: false },
];

const profiles = () =>
  ({
    getMe: vi.fn(() => unaryCall({ user: wireUser })),
    updateProfile: vi.fn(() => unaryCall({ user: wireUser })),
    changePassword: vi.fn(() => unaryCall({})),
    deleteAccount: vi.fn(() => unaryCall({})),
    listSessions: vi.fn(() => unaryCall({ sessions })),
    revokeSession: vi.fn(() => unaryCall({})),
    revokeOtherSessions: vi.fn(() => unaryCall({})),
  }) as unknown as IProfileServiceClient;

const admin = () =>
  ({
    listUsers: vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { users: [wireUser], page: { nextToken: 'next' } }
          : { users: [{ ...wireUser, id: { value: 'user-2' } }], page: { nextToken: '' } },
      ),
    ),
    getUser: vi.fn(() => unaryCall({ user: { ...wireUser, id: { value: 'user-2' } } })),
    updateUser: vi.fn(() => unaryCall({ user: wireUser })),
    setUserStatus: vi.fn(() => unaryCall({ user: { ...wireUser, status: 'disabled' } })),
    listUserSessions: vi.fn(() => unaryCall({ sessions })),
    revokeUserSessions: vi.fn(() => unaryCall({})),
    sendPasswordReset: vi.fn(() => unaryCall({})),
  }) as unknown as IUserAdminServiceClient;

const repository = (p = profiles(), a = admin()) =>
  ({ p, a, repo: new DefaultUserRepository(p, a, () => 'user-1') }) as const;

describe('DefaultUserRepository', () => {
  it('reads every page of the users', async () => {
    const { repo, a } = repository();

    const list = await repo.getAll();

    expect(list.items.map(user => user.id)).toEqual(['user-1', 'user-2']);
    expect(a.listUsers).toHaveBeenCalledTimes(2);
  });

  it('reads the own account with GetMe, another one with the admin service', async () => {
    const { repo, p, a } = repository();

    await repo.getById('user-1');
    await repo.getById('user-2');

    expect(p.getMe).toHaveBeenCalledOnce();
    expect(a.getUser).toHaveBeenCalledWith({ userId: { value: 'user-2' } });
  });

  it('changes the own profile with UpdateProfile', async () => {
    const { repo, p, a } = repository();

    await repo.update({ id: 'user-1', displayName: 'Ada L.' });

    expect(p.updateProfile).toHaveBeenCalledWith({ displayName: 'Ada L.' });
    expect(a.updateUser).not.toHaveBeenCalled();
  });

  it('sends the status of an activation', async () => {
    const { repo, a } = repository();

    const user = await repo.setActive('user-2', false);

    expect(a.setUserStatus).toHaveBeenCalledWith({ userId: { value: 'user-2' }, status: 'disabled' });
    expect(user.isActive).toBe(false);
  });

  it('revokes the other own sessions and counts them', async () => {
    const { repo, p } = repository();

    await expect(repo.revokeSessions('user-1')).resolves.toBe(1);
    expect(p.revokeOtherSessions).toHaveBeenCalledOnce();
  });

  it('revokes each session of another user', async () => {
    const { repo, a } = repository();

    await expect(repo.revokeSessions('user-2')).resolves.toBe(2);
    expect(a.revokeUserSessions).toHaveBeenCalledWith({ userId: { value: 'user-2' } });
  });

  it('revokes one own session, and refuses one of another user', async () => {
    const { repo, p } = repository();

    await repo.revokeSession('user-1', 's-2');
    expect(p.revokeSession).toHaveBeenCalledWith({ sessionId: { value: 's-2' } });

    await expect(repo.revokeSession('user-2', 's-9')).rejects.toMatchObject({
      code: 'UNIMPLEMENTED',
    });
  });
});
