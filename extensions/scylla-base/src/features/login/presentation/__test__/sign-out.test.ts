import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { contextStore } from '@platform/context';
import { signOut } from '../sign-out.ts';

const location = { href: '/acme/dashboard' };

beforeEach(() => {
  vi.stubGlobal('location', location);
  localStorage.setItem('token', 'a-token');
  localStorage.setItem('userId', 'user-1');
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme' } });
});

afterEach(() => vi.unstubAllGlobals());

describe('signOut', () => {
  it('removes the session, clears the context and loads the login page', () => {
    signOut();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(contextStore.getState().organization).toEqual({ id: null, name: null });
    expect(location.href).toBe('/login');
  });
});
