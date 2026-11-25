import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { contextStore } from '@platform/context';
import { signOut } from '../sign-out.ts';

const close = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@platform/grpc', () => ({ browserSession: { close } }));

const location = { href: '/acme/projects' };

/** The keys of the account: the sign-out removes them. */
const ACCOUNT_KEYS = [
  'userId',
  'scylla-user-state:user-1',
  'onboarding:user-1',
  'dashboards:org-1',
  'dashboards-default:org-1',
  'dashboards-visit:org-1',
  'scylla-command-bar-recent:org-1',
  'whats-new-seen:0.7.2:release',
  'scylla.blueprint.node-appearance',
];

/** The choices for the device: they stay. */
const DEVICE_KEYS = ['scylla-theme', 'scylla-locale', 'scylla.shell.second-sidebar-width'];

beforeEach(() => {
  vi.stubGlobal('location', location);
  localStorage.clear();
  for (const key of [...ACCOUNT_KEYS, ...DEVICE_KEYS]) localStorage.setItem(key, 'value');
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: null } });
});

afterEach(() => vi.unstubAllGlobals());

describe('signOut', () => {
  it('closes the session on the server, clears the context and loads the login page', async () => {
    await signOut();

    expect(close).toHaveBeenCalledOnce();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(contextStore.getState().workspace).toEqual({ id: null, name: null, slug: null });
    expect(location.href).toBe('/login');
  });

  it('removes the local keys of the account, and keeps the theme, the language and the sidebar', async () => {
    await signOut();

    expect(ACCOUNT_KEYS.filter(key => localStorage.getItem(key) !== null)).toEqual([]);
    expect(localStorage.getItem('scylla-workspace-context')).toBeNull();
    expect(DEVICE_KEYS.map(key => localStorage.getItem(key))).toEqual(['value', 'value', 'value']);
  });
});
