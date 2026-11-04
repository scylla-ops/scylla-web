import { describe, it, expect, beforeEach, vi } from 'vitest';
import { closeSession, hasSession, openSession, resolveUserWith } from '../session.ts';

const browserSession = vi.hoisted(() => ({
  open: vi.fn(),
  restore: vi.fn(async () => true),
  close: vi.fn(async () => undefined),
}));
vi.mock('@platform/grpc', () => ({ browserSession }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  browserSession.restore.mockResolvedValue(true);
});

describe('openSession', () => {
  it('gives the token to the transport and keeps the user id', () => {
    openSession({ value: 'a-token' }, 'user-1');

    expect(browserSession.open).toHaveBeenCalledWith({ value: 'a-token' });
    expect(localStorage.getItem('userId')).toBe('user-1');
  });
});

describe('hasSession', () => {
  it('is false when the cookie gives no token, and forgets the user id', async () => {
    localStorage.setItem('userId', 'user-1');
    browserSession.restore.mockResolvedValue(false);

    await expect(hasSession()).resolves.toBe(false);
    expect(localStorage.getItem('userId')).toBeNull();
  });

  it('asks the server who the user is after the redirect of a provider', async () => {
    resolveUserWith(async () => 'user-7');

    await expect(hasSession()).resolves.toBe(true);
    expect(localStorage.getItem('userId')).toBe('user-7');
  });
});

describe('closeSession', () => {
  it('closes the session on the server and removes the user id, and nothing else', async () => {
    openSession({ value: 'a-token' }, 'user-1');
    localStorage.setItem('scylla-context', '{}');

    await closeSession();

    expect(browserSession.close).toHaveBeenCalledOnce();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('scylla-context')).toBe('{}');
  });
});
