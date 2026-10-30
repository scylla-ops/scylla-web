import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type { IAuthServiceClient } from '@base/generated/scylla/auth/v1/auth.client.ts';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { DefaultLoginRepository } from '../default-login.repository.ts';
import { hasSession } from '../session.ts';

const client = (overrides: Partial<Record<keyof IAuthServiceClient, unknown>> = {}) =>
  ({
    login: vi.fn(() => unaryCall({ token: 'a-token', userId: { value: 'user-1' } })),
    requestPasswordReset: vi.fn(() => unaryCall({ delivery: PasswordResetDelivery.SERVER_LOG })),
    resetPassword: vi.fn(() => unaryCall({})),
    ...overrides,
  }) as unknown as IAuthServiceClient;

beforeEach(() => localStorage.clear());

describe('DefaultLoginRepository', () => {
  it('opens a session with the token the server gives', async () => {
    const auth = client();

    await new DefaultLoginRepository(auth).login('ada@example.com', 'hunter22');

    expect(auth.login).toHaveBeenCalledWith({
      identifier: 'ada@example.com',
      password: 'hunter22',
    });
    expect(hasSession()).toBe(true);
  });

  it('re-codes UNAUTHENTICATED as wrong credentials, so the global handler does not sign out', async () => {
    const auth = client({ login: vi.fn(() => failedCall('UNAUTHENTICATED', 'no such user')) });

    await expect(
      new DefaultLoginRepository(auth).login('ada@example.com', 'wrong'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Incorrect credentials' });
    expect(hasSession()).toBe(false);
  });

  it('gives the delivery of a reset request in domain terms', async () => {
    const auth = client();

    await expect(
      new DefaultLoginRepository(auth).requestPasswordReset('ada@example.com'),
    ).resolves.toBe('server-log');
    expect(auth.requestPasswordReset).toHaveBeenCalledWith({ email: { value: 'ada@example.com' } });
  });

  it('passes the token and the new password through', async () => {
    const auth = client();

    await new DefaultLoginRepository(auth).resetPassword('a-token', 'hunter22');

    expect(auth.resetPassword).toHaveBeenCalledWith({ token: 'a-token', newPassword: 'hunter22' });
  });
});
