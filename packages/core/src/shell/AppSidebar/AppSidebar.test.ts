import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import type { AccessPolicy, RoutePermission, ShellContributions } from '@scylla/core-sdk';
import { installTestNavigator } from '@test/navigator.ts';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import type { NavEntry } from '../../routing/compilation/nav-entries.ts';
import type { ShellConfig } from '../shell-config.ts';
import Badge from '../__test__/Badge.fixture.svelte';
import Stub from '../__test__/Stub.fixture.svelte';
import AppSidebarFixture from './AppSidebar.fixture.svelte';
import { RAIL_OPEN_DELAY_MS } from './rail.state.svelte.ts';

const LIST_SECRETS = testPermission('LIST_SECRETS');

const entry = (overrides: Partial<NavEntry> = {}): NavEntry => ({
  section: 'workspace',
  title: msg`Secrets`,
  mount: 'workspace',
  url: 'secrets',
  pattern: [':workspaceSlug', 'secrets'],
  permission: LIST_SECRETS,
  ...overrides,
});

const MACHINES = { id: 'machines', title: msg`Machines` };

const groupEntries: NavEntry[] = [
  entry({
    title: msg`Agents`,
    url: 'agents',
    pattern: [':workspaceSlug', 'agents'],
    permission: undefined,
    group: MACHINES,
  }),
  entry({
    title: msg`Apps`,
    url: 'apps',
    pattern: [':workspaceSlug', 'apps'],
    permission: undefined,
    group: MACHINES,
  }),
];

const policy = (held: readonly RoutePermission[], ready = true): AccessPolicy => ({
  can: permission => held.includes(permission),
  ready: () => ready,
  guard: Stub as AccessPolicy['guard'],
});

const configWith = (overrides: Partial<ShellConfig> = {}): ShellConfig => ({
  entries: [entry()],
  sections: [
    { id: 'workspace', title: msg`Workspace` },
    { id: 'system', title: msg`System` },
  ],
  access: policy([LIST_SECRETS]),
  contributions: [{ linkParams: () => ({ workspaceSlug: 'acme-corp' }) }],
  ...overrides,
});

const railOf = () => {
  const rail = document.querySelector<HTMLElement>('[data-slot="sidebar-rail-panel"]');
  if (!rail) throw new Error('no rail');
  return rail;
};

const secondSidebar = () => {
  const aside = document.querySelector<HTMLElement>('aside[data-slot="sidebar"]');
  if (!aside) throw new Error('no second sidebar');
  return aside;
};

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator({ pathname: '/acme-corp/dashboard' });
});

afterEach(() => {
  navigator.restore();
  vi.useRealTimers();
});

describe('the rail', () => {
  it('shows the entries that the access policy lets the user open', () => {
    render(AppSidebarFixture, { config: configWith() });

    expect(within(railOf()).getByRole('button', { name: /Secrets/ })).toBeInTheDocument();
  });

  it('hides an entry that the access policy denies', () => {
    render(AppSidebarFixture, { config: configWith({ access: policy([]) }) });

    expect(screen.queryByRole('button', { name: /Secrets/ })).not.toBeInTheDocument();
  });

  it('shows placeholders and no entry until the policy is ready', () => {
    const { container } = render(AppSidebarFixture, {
      config: configWith({
        entries: [entry({ permission: undefined })],
        access: policy([], false),
      }),
    });

    expect(screen.queryByRole('button', { name: /Secrets/ })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('hides a link whose mount parameters nothing can fill', () => {
    render(AppSidebarFixture, { config: configWith({ contributions: [] }) });

    expect(screen.queryByRole('button', { name: /Secrets/ })).not.toBeInTheDocument();
  });

  it('shows one item for a group, and opens its first page', async () => {
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });

    const rail = within(railOf());
    expect(rail.queryByRole('button', { name: /Agents/ })).not.toBeInTheDocument();

    await userEvent.click(rail.getByRole('button', { name: /Machines/ }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/agents', undefined);
  });

  it('tells the extensions which page the user opened, by its path in the mount', async () => {
    const onNavOpen = vi.fn();
    const contributions: ShellContributions[] = [
      { linkParams: () => ({ workspaceSlug: 'acme-corp' }), onNavOpen },
    ];
    render(AppSidebarFixture, { config: configWith({ contributions }) });

    await userEvent.click(within(railOf()).getByRole('button', { name: /Secrets/ }));

    expect(onNavOpen).toHaveBeenCalledWith('secrets');
  });

  it('keeps a link to the page and to the group, for what points at them', () => {
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });

    const machines = within(railOf()).getByRole('button', { name: /Machines/ });
    expect(machines).toHaveAttribute('data-nav-url', 'agents');
    expect(machines).toHaveAttribute('data-nav-group', 'machines');
  });

  it('opens after the pointer stops on it, and a click closes it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();
    expect(rail).toHaveAttribute('data-state', 'collapsed');

    await fireEvent.pointerMove(rail);
    await vi.advanceTimersByTimeAsync(RAIL_OPEN_DELAY_MS);
    expect(rail).toHaveAttribute('data-state', 'expanded');

    await fireEvent.click(within(rail).getByRole('button', { name: /Secrets/ }));
    expect(rail).toHaveAttribute('data-state', 'collapsed');
  });

  it('shows the footer of an extension at the end', () => {
    const contributions: ShellContributions[] = [
      { linkParams: () => ({ workspaceSlug: 'acme-corp' }), sidebarFooter: [Stub] },
    ];
    render(AppSidebarFixture, { config: configWith({ contributions }) });

    expect(within(railOf()).getByText('stub')).toBeInTheDocument();
  });

  it('puts a section with railItem at the end, as one item with all its pages', () => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: '/acme-corp/instance/users' });
    render(AppSidebarFixture, {
      config: configWith({
        sections: [{ id: 'system', title: msg`System`, railItem: { icon: undefined as never } }],
        entries: [
          entry({
            section: 'system',
            title: msg`Users`,
            url: 'instance/users',
            pattern: [':workspaceSlug', 'instance', 'users'],
            permission: undefined,
          }),
        ],
      }),
    });

    expect(within(railOf()).getByRole('button', { name: /System/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(secondSidebar()).getByRole('heading', { name: 'System' })).toBeInTheDocument();
    expect(within(secondSidebar()).getByRole('button', { name: /Users/ })).toBeInTheDocument();
  });
});

describe('the second sidebar', () => {
  beforeEach(() => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: '/acme-corp/apps/1' });
  });

  it('shows the pages of the section of the URL, under its name', () => {
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });

    const aside = within(secondSidebar());
    expect(aside.getByRole('heading', { name: 'Machines' })).toBeInTheDocument();
    expect(aside.getByRole('button', { name: /Agents/ })).toBeInTheDocument();
    expect(aside.getByRole('button', { name: /Apps/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks the section as the current one in the rail', () => {
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });

    expect(within(railOf()).getByRole('button', { name: /Machines/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens a page', async () => {
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });

    await userEvent.click(within(secondSidebar()).getByRole('button', { name: /Agents/ }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/agents', undefined);
  });

  it('renders the badge of an extension on each page', () => {
    const contributions: ShellContributions[] = [
      { linkParams: () => ({ workspaceSlug: 'acme-corp' }), navBadge: Badge },
    ];
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries, contributions }) });

    expect(screen.getByText('badge:agents')).toBeInTheDocument();
    expect(screen.getByText('badge:apps')).toBeInTheDocument();
  });

  it('shows nothing for a URL with no section', () => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: '/acme-corp/other' });
    render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });

    expect(within(secondSidebar()).queryByRole('heading')).not.toBeInTheDocument();
  });
});
