import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import {
  setAppNavigator,
  type AccessPolicy,
  type AppNavigator,
  type NavGroup,
  type NavLink,
  type PageLoader,
  type RouteSource,
} from '@scylla/core-sdk';
import { mountPath, type AppRouterConfig } from '../../routing/compilation/compile-routes.ts';
import { navEntriesFor } from '../../routing/compilation/nav-entries.ts';
import { createAppRouter } from '../../routing/runtime/app-router.ts';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import RouterView from '../../routing/view/RouterView/RouterView.svelte';
import Stub from '../__test__/Stub.fixture.svelte';
import ShellFrame from '../ShellFrame/ShellFrame.svelte';
import { setShellConfig } from '../shell-config.ts';
import { resetNavGroups } from './nav-groups.state.svelte.ts';

const MACHINES: NavGroup = { id: 'machines', title: msg`Machines` };
const LIST_LINKS = testPermission('LIST_LINKS');

const page: PageLoader = () => Promise.resolve({ default: Stub });
const nav = (overrides: Omit<NavLink, 'section'>): NavLink => ({
  section: 'workspace',
  ...overrides,
});

const modules: readonly RouteSource[] = [
  {
    id: 'test',
    routes: {
      public: [{ path: 'no-sidebar', page }],
      workspace: [
        { path: 'dashboard', page, nav: nav({ title: msg`Dashboard`, order: 1 }) },
        {
          path: 'agents',
          page,
          nav: nav({ title: msg`Agents`, order: 2, group: MACHINES }),
          children: [{ path: ':appId', page }],
        },
        { path: 'apps', page, nav: nav({ title: msg`Apps`, order: 3, group: MACHINES }) },
        { path: 'secrets', page, nav: nav({ title: msg`Secrets`, order: 4 }) },
      ],
    },
  },
];

const mounts: AppRouterConfig['mounts'] = {
  public: {},
  app: { shell: true },
  workspace: { parent: 'app', path: ':workspaceSlug' },
};

const access = $state({ ready: true, held: true });

const policy: AccessPolicy = {
  can: () => access.held,
  ready: () => access.ready,
  guard: Stub as AccessPolicy['guard'],
};

let navigator: AppNavigator;

const go = (pathname: string) => {
  navigator.navigate(pathname);
  flushSync();
};

const renderAt = (pathname: string) => {
  navigator.navigate(pathname, { replace: true });
  render(RouterView);
  flushSync();
};

const machines = () => screen.getByRole('button', { name: /Machines/ });
const toggle = () => userEvent.click(machines());

const expectOpen = () => {
  expect(machines()).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /Agents/ })).toBeInTheDocument();
};

const expectClosed = () => {
  expect(machines()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: /Agents/ })).not.toBeInTheDocument();
};

beforeEach(() => {
  access.ready = true;
  access.held = true;
  resetNavGroups();
  setShellConfig({
    entries: navEntriesFor(modules, mount => mountPath(mount, mounts)).map(entry => ({
      ...entry,
      permission: LIST_LINKS,
    })),
    sections: [{ id: 'workspace', title: msg`Workspace` }],
    access: policy,
    contributions: [],
  });
  navigator = createAppRouter({ mounts, modules, fallback: Stub, shell: ShellFrame });
  setAppNavigator(navigator);
});

afterEach(() => {
  setAppNavigator(null);
  setShellConfig(null);
});

describe('a folding group of the sidebar, when no user action changed it', () => {
  it('is closed on a page out of the group', () => {
    renderAt('/acme/dashboard');

    expectClosed();
  });

  it('is open on a page in the group', () => {
    renderAt('/acme/agents');

    expectOpen();
  });

  it('opens when the user goes to a page in the group', () => {
    renderAt('/acme/dashboard');

    go('/acme/agents');

    expectOpen();
  });

  it('stays open between the pages in the group', () => {
    renderAt('/acme/agents');

    go('/acme/agents/agent-1');
    expectOpen();

    go('/acme/apps');
    expectOpen();
  });

  it('stays open when the user leaves the pages of the group', () => {
    renderAt('/acme/agents');

    go('/acme/dashboard');
    expectOpen();

    go('/acme/secrets');
    expectOpen();
  });

  it('opens when the links arrive after the page', () => {
    access.held = false;
    renderAt('/acme/agents');
    expect(screen.queryByRole('button', { name: /Machines/ })).not.toBeInTheDocument();

    access.held = true;
    flushSync();

    expectOpen();
  });
});

describe('a folding group of the sidebar, after a user action', () => {
  it('stays open on the other pages after the user opened it', async () => {
    renderAt('/acme/dashboard');

    await toggle();
    expectOpen();

    go('/acme/secrets');
    expectOpen();
  });

  it('stays closed on the pages out of the group after the user closed it', async () => {
    renderAt('/acme/agents');

    await toggle();
    expectClosed();

    go('/acme/dashboard');
    expectClosed();

    go('/acme/secrets');
    expectClosed();
  });

  it('opens on a page in the group after the user closed it', async () => {
    renderAt('/acme/dashboard');
    await toggle();
    await toggle();
    expectClosed();

    go('/acme/agents');

    expectOpen();
  });

  it('opens on the next page in the group after the user closed it on a page in the group', async () => {
    renderAt('/acme/agents');
    await toggle();

    go('/acme/agents/agent-1');

    expectOpen();
  });

  it('stays closed on a page in the group when only the query string changes', async () => {
    renderAt('/acme/agents');
    await toggle();

    go('/acme/agents?status=online');

    expectClosed();
  });

  it('stays closed on a page in the group when the links change and come back', async () => {
    renderAt('/acme/agents');
    await toggle();

    access.held = false;
    flushSync();
    access.held = true;
    flushSync();

    expectClosed();
  });
});

describe('a folding group of the sidebar, when the sidebar mounts again', () => {
  it('stays open after a page with no sidebar', async () => {
    renderAt('/acme/dashboard');
    await toggle();

    go('/no-sidebar');
    expect(screen.queryByRole('button', { name: /Machines/ })).not.toBeInTheDocument();

    go('/acme/dashboard');
    expectOpen();
  });

  it('stays closed after a page with no sidebar, when the user closed it', async () => {
    renderAt('/acme/agents');
    await toggle();

    go('/no-sidebar');
    go('/acme/dashboard');

    expectClosed();
  });

  it('opens when the user comes back to a page in the group where the user closed it', async () => {
    renderAt('/acme/agents');
    await toggle();

    go('/no-sidebar');
    go('/acme/agents');

    expectOpen();
  });

  it('stays open while the permissions are not ready', async () => {
    renderAt('/acme/dashboard');
    await toggle();

    access.ready = false;
    flushSync();
    expect(screen.queryByRole('button', { name: /Machines/ })).not.toBeInTheDocument();

    access.ready = true;
    flushSync();
    expectOpen();
  });

  it('stays closed on a page in the group while the permissions are not ready', async () => {
    renderAt('/acme/agents');
    await toggle();

    access.ready = false;
    flushSync();
    access.ready = true;
    flushSync();

    expectClosed();
  });
});
