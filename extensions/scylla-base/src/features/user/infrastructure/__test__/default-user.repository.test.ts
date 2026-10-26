// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type { User } from '@base/generated/scylla/user/v1/user.ts';
import type { IUserServiceClient } from '@base/generated/scylla/user/v1/user.client.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultUserRepository } from '../default-user.repository.ts';

const wireUser: User = {
  userId: { value: 'user-1' },
  username: 'ada',
  email: { value: 'ada@example.com' },
  isActive: true,
};

const client = () =>
  ({
    getMe: vi.fn(() => unaryCall({ user: wireUser })),
    createUser: vi.fn(() => unaryCall({ user: wireUser })),
    updateUser: vi.fn(() => unaryCall({ user: wireUser })),
    setUserActive: vi.fn(() => unaryCall({ user: { ...wireUser, isActive: false } })),
    changePassword: vi.fn(() => unaryCall({})),
    sendPasswordReset: vi.fn(() => unaryCall({ delivery: PasswordResetDelivery.MAIL })),
    revokeUserSessions: vi.fn(() => unaryCall({ revoked: 3 })),
    deleteAccount: vi.fn(() => unaryCall({})),
    listUserAccess: vi.fn(() =>
      unaryCall({
        access: [
          {
            grantId: { value: 'grant-1' },
            scope: { scope: { oneofKind: 'system', system: {} } },
            organizationName: '',
            projectName: '',
            roleId: { value: 'system-admin' },
            roleName: 'System admin',
          },
        ],
      }),
    ),
    listUserSessions: vi.fn(() =>
      unaryCall({
        sessions: [
          {
            sessionId: { value: 'session-1' },
            userAgent: 'curl/8.7.1',
            ipAddress: '203.0.113.7',
            current: true,
          },
        ],
      }),
    ),
    revokeUserSession: vi.fn(() => unaryCall({})),
  }) satisfies Partial<Record<keyof IUserServiceClient, unknown>>;

const repositoryOn = (fake: ReturnType<typeof client>) =>
  new DefaultUserRepository(fake as unknown as IUserServiceClient);

describe('DefaultUserRepository', () => {
  it('reads the account of the session', async () => {
    const result = await repositoryOn(client()).getMe();

    expect(result).toMatchObject({ userId: 'user-1', email: 'ada@example.com' });
  });

  it('fails on a response without a user instead of giving an empty one', async () => {
    const fake = client();
    fake.getMe.mockReturnValue(unaryCall({} as { user: User }));

    await expect(repositoryOn(fake).getMe()).rejects.toThrow(
      'Server returned a response without a user.',
    );
  });

  it('sends the email and the display name of a new user', async () => {
    const fake = client();

    await repositoryOn(fake).create({
      email: 'ada@example.com',
      username: 'ada',
      password: 'hunter22',
      displayName: 'Ada',
    });

    expect(fake.createUser).toHaveBeenCalledWith({
      email: { value: 'ada@example.com' },
      username: 'ada',
      password: 'hunter22',
      displayName: 'Ada',
    });
  });

  it('sends only the changed fields of an update', async () => {
    const fake = client();

    await repositoryOn(fake).update({ userId: 'user-1', displayName: 'Ada' });

    expect(fake.updateUser).toHaveBeenCalledWith({
      userId: { value: 'user-1' },
      displayName: 'Ada',
    });
  });

  it('gives the new status of the user', async () => {
    const result = await repositoryOn(client()).setActive('user-1', false);

    expect(result.isActive).toBe(false);
  });

  it('gives the delivery of a reset link in domain terms', async () => {
    const result = await repositoryOn(client()).sendPasswordReset('user-1');

    expect(result).toBe('mail');
  });

  it('gives the number of revoked sessions', async () => {
    const result = await repositoryOn(client()).revokeSessions('user-1');

    expect(result).toBe(3);
  });

  it('passes the passwords through', async () => {
    const fake = client();
    const repository = repositoryOn(fake);

    await repository.changePassword('old-password', 'new-password');
    await repository.deleteAccount('old-password');

    expect(fake.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
    expect(fake.deleteAccount).toHaveBeenCalledWith({ password: 'old-password' });
  });

  it('maps every grant of the user', async () => {
    const result = await repositoryOn(client()).listAccess('user-1');

    expect(result).toEqual([
      expect.objectContaining({ grantId: 'grant-1', scope: 'system', roleName: 'System admin' }),
    ]);
  });

  it('maps every session of the user', async () => {
    const result = await repositoryOn(client()).listSessions('user-1');

    expect(result).toEqual([
      expect.objectContaining({ sessionId: 'session-1', ipAddress: '203.0.113.7', current: true }),
    ]);
  });

  it('revokes one session of the user', async () => {
    const fake = client();

    await repositoryOn(fake).revokeSession('user-1', 'session-1');

    expect(fake.revokeUserSession).toHaveBeenCalledWith({
      userId: { value: 'user-1' },
      sessionId: { value: 'session-1' },
    });
  });
});
