import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  checkPasswordConfirmation,
  checkUsername,
  closeSession,
  hasSession,
  openSession,
} from '@scylla/base-sdk';

/** What another extension (a sign-up page, for one) takes from the SDK for an account. */

afterEach(() => localStorage.clear());

describe('the account API of @scylla/base-sdk', () => {
  it('gives the account checks of scylla-base, with the same messages', () => {
    expect(checkEmail('ada@example.com')).toBeUndefined();
    expect(checkEmail('ada')?.message).toBe('Enter a valid email address.');
    expect(checkNewPassword('short')?.message).toBe('The password must have 8 to 128 characters.');
    expect(checkPasswordConfirmation('a', 'b')?.message).toBe(
      'The two passwords are not the same.',
    );
    expect(checkUsername('ada@home')?.message).toBe('A username cannot contain "@".');
    expect(checkDisplayName('a'.repeat(101))?.message).toBe(
      'The display name must have 100 characters at most.',
    );
  });

  it('opens a session with the token of a sign-in, and closes it on the server', async () => {
    const urlOf = (input: RequestInfo | URL) =>
      input instanceof Request ? input.url : input.toString();
    const fetch = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        new Response(null, {
          headers: { 'grpc-status': urlOf(input).endsWith('TokenService/SignOut') ? '0' : '16' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const farFuture = { seconds: BigInt(Math.floor(Date.now() / 1000) + 3600), nanos: 0 };

    openSession({ value: 'a-token', expiresAt: farFuture }, 'user-1');
    await expect(hasSession()).resolves.toBe(true);

    await closeSession();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(fetch.mock.calls.some(([input]) => urlOf(input).endsWith('TokenService/SignOut'))).toBe(
      true,
    );
    vi.unstubAllGlobals();
  });
});
