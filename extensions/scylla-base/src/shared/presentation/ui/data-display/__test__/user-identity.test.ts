// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { userInitials, userName, userSecondaryLine } from '../user-identity.ts';

const ada = { username: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com' };

describe('userName', () => {
  it('prefers the display name', () => {
    expect(userName(ada)).toBe('Ada Lovelace');
  });

  it('falls back to the username when there is no display name', () => {
    expect(userName({ username: 'ravenne' })).toBe('ravenne');
  });

  it('falls back to the username when the display name is empty', () => {
    expect(userName({ username: 'ravenne', displayName: '' })).toBe('ravenne');
  });

  it('names a missing user "Deleted user", never by an id', () => {
    expect(userName(undefined)).toBe('Deleted user');
  });

  it('names a user that the page cannot read "Unknown user" on request', () => {
    expect(userName(undefined, 'unknown')).toBe('Unknown user');
  });
});

describe('userSecondaryLine', () => {
  it('shows the email when it is known', () => {
    expect(userSecondaryLine(ada)).toBe('ada@example.com');
  });

  it('shows the handle when the email is not known', () => {
    expect(userSecondaryLine({ username: 'ravenne' })).toBe('@ravenne');
  });
});

describe('userInitials', () => {
  it('takes the first letter of the first two words of the display name', () => {
    expect(userInitials(ada)).toBe('AL');
  });

  it('splits a username on its separators', () => {
    expect(userInitials({ username: 'john.doe' })).toBe('JD');
  });

  it('gives one letter for a one-word name', () => {
    expect(userInitials({ username: 'ravenne' })).toBe('R');
  });
});
