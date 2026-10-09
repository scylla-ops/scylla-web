import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
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

vi.mock('../LanguageSelector/LanguageSelector.svelte', async () => ({
  default: (await import('../__test__/Stub.fixture.svelte')).default,
}));

const LIST_SECRETS = testPermission('LIST_SECRETS');

const entry = (overrides: Partial<NavEntry> = {}): NavEntry => ({
  section: 'organization',
  title: msg`Secrets`,
  mount: 'organization',
  url: 'secrets',
  pattern: [':organizationSlug', 'secrets'],
  permission: LIST_SECRETS,
  ...overrides,
});

const policy = (held: readonly RoutePermission[], ready = true): AccessPolicy => ({
  can: permission => held.includes(permission),
  ready: () => ready,
  guard: Stub as AccessPolicy['guard'],
});

const configWith = (overrides: Partial<ShellConfig> = {}): ShellConfig => ({
  entries: [entry()],
  sections: [
    { id: 'organization', title: msg`Organization`, header: Stub },
    { id: 'system', title: msg`System` },
  ],
  access: policy([LIST_SECRETS]),
  contributions: [{ linkParams: () => ({ organizationSlug: 'acme-corp' }) }],
  ...overrides,
});

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator({ pathname: '/acme-corp/dashboard' });
});

afterEach(() => navigator.restore());

describe('AppSidebar', () => {
  it('shows the entries that the access policy lets the user open', () => {
    render(AppSidebarFixture, { config: configWith() });

    expect(screen.getByRole('button', { name: /Secrets/ })).toBeInTheDocument();
  });

  it('hides an entry that the access policy denies', () => {
    render(AppSidebarFixture, { config: configWith({ access: policy([]) }) });

    expect(screen.queryByRole('button', { name: /Secrets/ })).not.toBeInTheDocument();
  });

  it('shows placeholders and no entry until the policy is ready, but keeps the section headers', () => {
    render(AppSidebarFixture, {
      config: configWith({ entries: [entry({ permission: undefined })], access: policy([], false) }),
    });

    expect(screen.queryByRole('button', { name: /Secrets/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('stub').length).toBeGreaterThan(0);
  });

  it('opens the page of an entry, with the mount parameters that the extensions give', async () => {
    render(AppSidebarFixture, { config: configWith() });

    await userEvent.click(screen.getByRole('button', { name: /Secrets/ }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/secrets', undefined);
  });

  it('hides a link whose mount parameters nothing can fill', () => {
    render(AppSidebarFixture, { config: configWith({ contributions: [] }) });

    expect(screen.queryByRole('button', { name: /Secrets/ })).not.toBeInTheDocument();
  });

  it('tells the extensions which link the user opened, by its path in the mount', async () => {
    const onNavOpen = vi.fn();
    const contributions: ShellContributions[] = [
      { linkParams: () => ({ organizationSlug: 'acme-corp' }), onNavOpen },
    ];
    render(AppSidebarFixture, { config: configWith({ contributions }) });

    await userEvent.click(screen.getByRole('button', { name: /Secrets/ }));

    expect(onNavOpen).toHaveBeenCalledWith('secrets');
  });

  it('renders the badge of an extension on every link, and its footer below the links', () => {
    const contributions: ShellContributions[] = [
      { linkParams: () => ({ organizationSlug: 'acme-corp' }), navBadge: Badge, sidebarFooter: [Stub] },
    ];
    render(AppSidebarFixture, {
      config: configWith({ contributions, sections: [{ id: 'organization', title: msg`Org` }] }),
    });

    expect(screen.getByText('badge:secrets')).toBeInTheDocument();
    // The language selector (a stub here) and the footer of the extension.
    expect(screen.getAllByText('stub')).toHaveLength(2);
  });
});
