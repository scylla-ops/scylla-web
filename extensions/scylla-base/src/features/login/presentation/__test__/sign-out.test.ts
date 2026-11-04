import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { contextStore } from '@platform/context';
import { signOut } from '../sign-out.ts';

const close = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@platform/grpc', () => ({ browserSession: { close } }));

const location = { href: '/acme/projects' };

beforeEach(() => {
  vi.stubGlobal('location', location);
  localStorage.setItem('userId', 'user-1');
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme', slug: null } });
});

afterEach(() => vi.unstubAllGlobals());

describe('signOut', () => {
  it('closes the session on the server, clears the context and loads the login page', async () => {
    await signOut();

    expect(close).toHaveBeenCalledOnce();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(contextStore.getState().organization).toEqual({ id: null, name: null, slug: null });
    expect(location.href).toBe('/login');
  });
});
