import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { msg } from '@lingui/core/macro';
import { setNavLinks, type AppNavLink } from '@scylla/core-sdk';
import { installTestNavigator } from '@test/navigator.ts';
import { redirectToAdminHome } from '../admin-redirect.effect.svelte.ts';

const authz = vi.hoisted(() => ({ ready: true }));

vi.mock('@platform/authz', () => ({ authorizationReady: () => authz.ready }));

const link = (section: string, href: string): AppNavLink => ({
  href,
  url: href.split('/').pop() ?? '',
  title: msg`Page`,
  section: { id: section, title: msg`Section` },
});

let navigator: ReturnType<typeof installTestNavigator>;

const run = () => {
  const cleanup = $effect.root(() => {
    redirectToAdminHome();
  });
  flushSync();
  cleanup();
};

beforeEach(() => {
  navigator = installTestNavigator({ pathname: '/admin' });
  authz.ready = true;
});

afterEach(() => {
  navigator.restore();
  setNavLinks(() => []);
});

describe('redirectToAdminHome', () => {
  it('opens the first page of the administration that the person may see', () => {
    setNavLinks(() => [
      link('workspace', '/acme/dashboard'),
      link('instance', '/admin/roles'),
      link('instance', '/admin/settings'),
    ]);
    run();

    expect(navigator.navigate).toHaveBeenCalledWith('/admin/roles', { replace: true });
  });

  it('waits for the permissions of the person', () => {
    authz.ready = false;
    setNavLinks(() => [link('instance', '/admin/roles')]);
    run();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('opens the app when the person may see no page of the administration', () => {
    setNavLinks(() => [link('workspace', '/acme/dashboard')]);
    run();

    expect(navigator.navigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
