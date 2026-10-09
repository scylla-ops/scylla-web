import { describe, it, expect, beforeEach } from 'vitest';
import { openSession } from '../open-session.ts';

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
