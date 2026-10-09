import { describe, it, expect, afterEach } from 'vitest';
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
    expect(checkNewPassword('short')?.message).toBe('The password must have 8 to 255 characters.');
    expect(checkPasswordConfirmation('a', 'b')?.message).toBe(
      'The two passwords are not the same.',
    );
    expect(checkUsername('ada@home')?.message).toBe('A username cannot contain "@".');
    expect(checkDisplayName('a'.repeat(101))?.message).toBe(
      'The display name must have 100 characters at most.',
    );
  });

  it('tells whether a session is open', () => {
    expect(hasSession()).toBe(false);

    openSession('a-token', 'user-1');
    expect(hasSession()).toBe(true);

    closeSession();
    expect(hasSession()).toBe(false);
  });
});
