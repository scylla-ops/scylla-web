import { describe, it, expect, beforeEach } from 'vitest';
import { closeSession, hasSession, openSession } from '../session.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('openSession', () => {
  it('writes the keys the transport and the auth guard read', () => {
    openSession('a-token', 'user-1');

    expect(localStorage.getItem('token')).toBe('a-token');
    expect(localStorage.getItem('userId')).toBe('user-1');
  });
});

describe('closeSession', () => {
  it('removes the token and the user id, and nothing else', () => {
    openSession('a-token', 'user-1');
    localStorage.setItem('scylla-context', '{}');

    closeSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('scylla-context')).toBe('{}');
  });
});

describe('hasSession', () => {
  it('is false with no token, and with an empty one', () => {
    expect(hasSession()).toBe(false);

    localStorage.setItem('token', '');
    expect(hasSession()).toBe(false);
  });

  it('is true once a session is open, and false again once it is closed', () => {
    openSession('a-token', 'user-1');
    expect(hasSession()).toBe(true);

    closeSession();
    expect(hasSession()).toBe(false);
  });
});
