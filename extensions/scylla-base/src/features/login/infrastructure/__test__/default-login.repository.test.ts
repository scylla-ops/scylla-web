import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IAccountServiceClient } from '@base/generated/scylla/accounts/v1/account_service.client.ts';
import type { IProfileServiceClient } from '@base/generated/scylla/accounts/v1/profile_service.client.ts';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { DefaultLoginRepository } from '../default-login.repository.ts';

const browserSession = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@platform/grpc', () => ({ browserSession }));

const token = { value: 'a-token' };

const accounts = (overrides: Partial<Record<keyof IAccountServiceClient, unknown>> = {}) =>
  ({
    signIn: vi.fn(() => unaryCall({ token, refreshToken: '' })),
    signUp: vi.fn(() => unaryCall({})),
    verifyEmail: vi.fn(() => unaryCall({})),
    listSignInMethods: vi.fn(() =>
      unaryCall({
        providers: [{ slug: 'github', displayName: 'GitHub', kind: 'github' }],
        signUpMode: 'invite_only',
        mailSender: 'no-reply@scylla.example',
      }),
    ),
    resendVerificationEmail: vi.fn(() => unaryCall({})),
    requestPasswordReset: vi.fn(() => unaryCall({})),
    resetPassword: vi.fn(() => unaryCall({})),
    ...overrides,
  }) as unknown as IAccountServiceClient;

const acceptedAt = { seconds: 1_795_000_000n, nanos: 0 };

const profiles = () =>
  ({
    getMe: vi.fn(() =>
      unaryCall({
        user: { id: { value: 'user-1' }, displayName: 'Ada', email: 'ada@example.com' },
        termsAcceptanceRequired: true,
        acceptedTerms: { version: '1.0', acceptedAt },
      }),
    ),
    acceptTerms: vi.fn(() => unaryCall({ acceptance: { version: '2.0', acceptedAt } })),
  }) as unknown as IProfileServiceClient;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('DefaultLoginRepository', () => {
  it('signs in with the cookie, keeps the token and the id of the user', async () => {
    const client = accounts();

    await new DefaultLoginRepository(client, profiles()).login('ada@example.com', 'hunter22');

    expect(client.signIn).toHaveBeenCalledWith({
      identifier: 'ada@example.com',
      password: 'hunter22',
      cookie: true,
    });
    expect(browserSession.open).toHaveBeenCalledWith(token);
    expect(localStorage.getItem('userId')).toBe('user-1');
  });

  it('re-codes UNAUTHENTICATED as wrong credentials, so the global handler does not sign out', async () => {
    const client = accounts({ signIn: vi.fn(() => failedCall('UNAUTHENTICATED', 'no such user')) });

    await expect(
      new DefaultLoginRepository(client, profiles()).login('ada@example.com', 'wrong'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Incorrect credentials' });
    expect(browserSession.open).not.toHaveBeenCalled();
  });

  it('gives the sign-in methods in domain terms', async () => {
    await expect(
      new DefaultLoginRepository(accounts(), profiles()).listSignInMethods(),
    ).resolves.toEqual({
      providers: [{ slug: 'github', displayName: 'GitHub', kind: 'github' }],
      signUpMode: 'invite_only',
      mailSender: 'no-reply@scylla.example',
    });
  });

  it('asks for a new link to verify an email', async () => {
    const client = accounts();

    await new DefaultLoginRepository(client, profiles()).resendVerificationEmail('ada@example.com');

    expect(client.resendVerificationEmail).toHaveBeenCalledWith({ email: 'ada@example.com' });
  });

  it('sends the sign-up with an empty invitation by default', async () => {
    const client = accounts();

    await new DefaultLoginRepository(client, profiles()).signUp({
      email: 'ada@example.com',
      password: 'hunter22',
      displayName: 'Ada',
    });

    expect(client.signUp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'hunter22',
      displayName: 'Ada',
      invitationToken: '',
    });
  });

  it('sends the version of the terms that the person accepted', async () => {
    const client = accounts();

    await new DefaultLoginRepository(client, profiles()).signUp({
      email: 'ada@example.com',
      password: 'hunter22',
      displayName: 'Ada',
      acceptedTermsVersion: '2.0',
    });

    expect(client.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ acceptedTermsVersion: '2.0' }),
    );
  });

  it('gives the terms of the user of the session in domain terms', async () => {
    await expect(new DefaultLoginRepository(accounts(), profiles()).termsStatus()).resolves.toEqual(
      {
        acceptanceRequired: true,
        accepted: { version: '1.0', acceptedAt: '2026-11-18T11:06:40.000Z' },
        displayName: 'Ada',
        email: 'ada@example.com',
      },
    );
  });

  it('accepts a version of the terms, and gives the acceptance', async () => {
    const client = profiles();

    const acceptance = await new DefaultLoginRepository(accounts(), client).acceptTerms('2.0');

    expect(client.acceptTerms).toHaveBeenCalledWith({ version: '2.0' });
    expect(acceptance).toEqual({ version: '2.0', acceptedAt: '2026-11-18T11:06:40.000Z' });
  });

  it('passes the token and the new password through', async () => {
    const client = accounts();

    await new DefaultLoginRepository(client, profiles()).resetPassword('a-token', 'hunter22');

    expect(client.resetPassword).toHaveBeenCalledWith({ token: 'a-token', password: 'hunter22' });
  });
});
