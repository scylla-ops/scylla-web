import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import type { AccessPolicy, RoutePermission, ShellContributions } from '@scylla/core-sdk';
import { installTestNavigator } from '@test/navigator.ts';
import { findTooltip, queryTooltip } from '@test/render.ts';
import { testPermission } from '../../routing/__test__/test-permission.fixture.ts';
import type { NavEntry } from '../../routing/compilation/nav-entries.ts';
import type { ShellConfig } from '../shell-config.ts';
import Badge from '../__test__/Badge.fixture.svelte';
import Stub from '../__test__/Stub.fixture.svelte';
import AppSidebarFixture from './AppSidebar.fixture.svelte';
import AppSidebarSheetFixture from './AppSidebarSheet.fixture.svelte';

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

  it('stays closed while the pointer moves on it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();

    await fireEvent.pointerMove(rail);
    await vi.advanceTimersByTimeAsync(1000);

    expect(rail).toHaveAttribute('data-state', 'collapsed');
  });

  it('opens and closes on a click on an empty part', async () => {
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();

    await fireEvent.click(rail);
    expect(rail).toHaveAttribute('data-state', 'expanded');

    await fireEvent.click(rail);
    expect(rail).toHaveAttribute('data-state', 'collapsed');
  });

  it('opens and closes on a click on its separator, whose cursor shows the direction', async () => {
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();
    const separator = within(rail).getByRole('button', { name: 'Toggle Sidebar' });
    expect(separator).toHaveClass('cursor-e-resize');
    expect(separator).toHaveAttribute('aria-expanded', 'false');

    await fireEvent.click(separator);
    expect(rail).toHaveAttribute('data-state', 'expanded');
    expect(separator).toHaveClass('cursor-w-resize');
    expect(separator).toHaveAttribute('aria-expanded', 'true');

    await fireEvent.click(separator);
    expect(rail).toHaveAttribute('data-state', 'collapsed');
  });

  it('names a row in a tooltip while the closed rail shows only the icons', async () => {
    render(AppSidebarFixture, { config: configWith() });

    await userEvent.hover(within(railOf()).getByRole('button', { name: /Secrets/ }));

    expect(await findTooltip()).toHaveTextContent('Secrets');
  });

  it('gives a row no tooltip while the open rail shows its title', async () => {
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();
    await fireEvent.click(rail);

    await userEvent.hover(within(rail).getByRole('button', { name: /Secrets/ }));

    expect(queryTooltip()).toBeNull();
  });

  it('opens the page of a row without opening the rail, and closes an open rail', async () => {
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();
    const secrets = within(rail).getByRole('button', { name: /Secrets/ });

    await fireEvent.click(secrets);
    expect(rail).toHaveAttribute('data-state', 'collapsed');
    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/secrets', undefined);

    await fireEvent.click(rail);
    await fireEvent.click(secrets);
    expect(rail).toHaveAttribute('data-state', 'collapsed');
  });

  it('closes on a press outside and on Escape', async () => {
    render(AppSidebarFixture, { config: configWith() });
    const rail = railOf();

    await fireEvent.click(rail);
    await fireEvent.pointerDown(document.body);
    expect(rail).toHaveAttribute('data-state', 'collapsed');

    await fireEvent.click(rail);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(rail).toHaveAttribute('data-state', 'collapsed');
  });

  it('stays open while one of its menus is open', async () => {
    const contributions: ShellContributions[] = [
      { linkParams: () => ({ workspaceSlug: 'acme-corp' }), sidebarFooter: [Stub] },
    ];
    render(AppSidebarFixture, { config: configWith({ contributions }) });
    const rail = railOf();
    within(rail).getByText('stub').setAttribute('data-state', 'open');

    await fireEvent.click(rail);
    await fireEvent.pointerDown(document.body);
    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(rail).toHaveAttribute('data-state', 'expanded');
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

  it('shows the heading of a page above its link', () => {
    const entries = groupEntries.map((item, index) =>
      index === 1 ? { ...item, heading: msg`Quick filters` } : item,
    );
    render(AppSidebarFixture, { config: configWith({ entries }) });

    expect(within(secondSidebar()).getByText('Quick filters')).toBeInTheDocument();
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

describe('the handle of the second sidebar', () => {
  const STORAGE_KEY = 'scylla.shell.second-sidebar-width';
  const viewport = window.innerWidth;
  const handle = () => screen.getByRole('separator', { name: 'Resize sidebar' });
  const slot = () => {
    const container = document.querySelector<HTMLElement>('[data-slot="sidebar-container"]');
    if (!container) throw new Error('no sidebar container');
    return container;
  };

  const renderOnPage = (pathname = '/acme-corp/apps/1') => {
    navigator.restore();
    navigator = installTestNavigator({ pathname });
    return render(AppSidebarFixture, { config: configWith({ entries: groupEntries }) });
  };

  const drag = async (from: number, to: number) => {
    await fireEvent.pointerDown(handle(), { button: 0, isPrimary: true, clientX: from });
    await fireEvent.pointerMove(handle(), { clientX: to });
    await fireEvent.pointerUp(handle(), { clientX: to });
  };

  beforeEach(() => {
    window.innerWidth = 1920;
    localStorage.clear();
  });

  afterEach(() => {
    window.innerWidth = viewport;
    localStorage.clear();
  });

  it('is a vertical separator that tells the width and its limits', () => {
    renderOnPage();

    expect(handle()).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle()).toHaveAttribute('aria-valuenow', '200');
    expect(handle()).toHaveAttribute('aria-valuemin', '140');
    expect(handle()).toHaveAttribute('aria-valuemax', '400');
    expect(handle()).toHaveAttribute('aria-controls', secondSidebar().id);
    expect(handle()).toHaveAttribute('tabindex', '0');
    expect(handle()).toHaveClass('cursor-ew-resize');
  });

  it('gives the page the room that the rail and the second sidebar leave', () => {
    renderOnPage();

    expect(slot().style.width).toBe('256px');
  });

  it('moves with a drag, stores the width at the end, and keeps the cursor during the drag', async () => {
    renderOnPage();

    await fireEvent.pointerDown(handle(), { button: 0, isPrimary: true, clientX: 256 });
    expect(handle()).toHaveAttribute('data-active', 'pointer');
    expect(document.documentElement).toHaveClass('cursor-ew-resize');

    await fireEvent.pointerMove(handle(), { clientX: 316 });
    expect(slot().style.width).toBe('316px');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    await fireEvent.pointerUp(handle(), { clientX: 316 });
    expect(handle()).not.toHaveAttribute('data-active');
    expect(document.documentElement).not.toHaveClass('cursor-ew-resize');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('260');
  });

  it('does not go past the limits with a drag', async () => {
    renderOnPage();

    await drag(256, 40);
    expect(handle()).toHaveAttribute('aria-valuenow', '140');

    await drag(256, 1200);
    expect(handle()).toHaveAttribute('aria-valuenow', '400');
  });

  it('ignores a press with another button', async () => {
    renderOnPage();

    await fireEvent.pointerDown(handle(), { button: 2, isPrimary: true, clientX: 256 });
    await fireEvent.pointerMove(handle(), { clientX: 316 });

    expect(handle()).toHaveAttribute('aria-valuenow', '200');
  });

  it('moves with the keyboard, and each key stores the width', async () => {
    renderOnPage();
    handle().focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(handle()).toHaveAttribute('aria-valuenow', '216');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('216');

    await userEvent.keyboard('{ArrowLeft}');
    expect(handle()).toHaveAttribute('aria-valuenow', '200');

    await userEvent.keyboard('{ArrowLeft}');
    expect(handle()).toHaveAttribute('aria-valuenow', '184');

    await userEvent.keyboard('{End}');
    expect(handle()).toHaveAttribute('aria-valuenow', '400');

    await userEvent.keyboard('{ArrowRight}');
    expect(handle()).toHaveAttribute('aria-valuenow', '400');

    await userEvent.keyboard('{Home}');
    expect(handle()).toHaveAttribute('aria-valuenow', '140');

    await userEvent.keyboard('{ArrowLeft}');
    expect(handle()).toHaveAttribute('aria-valuenow', '140');
  });

  it.each([
    ['a double click', () => fireEvent.dblClick(handle())],
    [
      'Enter',
      async () => {
        handle().focus();
        await userEvent.keyboard('{Enter}');
      },
    ],
  ])('goes back to the default width with %s, and stores it', async (_name, reset) => {
    localStorage.setItem(STORAGE_KEY, '320');
    renderOnPage();

    await reset();

    expect(handle()).toHaveAttribute('aria-valuenow', '200');
    expect(slot().style.width).toBe('256px');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('200');
  });

  it('gives the full text of a link in its title, because a narrow second sidebar cuts it', () => {
    renderOnPage();

    expect(within(secondSidebar()).getByTitle('Agents')).toHaveClass('truncate');
  });

  it('keeps the width after a page load', async () => {
    const { unmount } = renderOnPage();
    await drag(256, 356);
    unmount();

    renderOnPage();

    expect(handle()).toHaveAttribute('aria-valuenow', '300');
    expect(slot().style.width).toBe('356px');
  });

  it('gives the room of the page back when the window gets narrow', async () => {
    localStorage.setItem(STORAGE_KEY, '400');
    renderOnPage();
    expect(slot().style.width).toBe('456px');

    window.innerWidth = 1024;
    await fireEvent(window, new Event('resize'));
    expect(handle()).toHaveAttribute('aria-valuemax', '264');
    expect(slot().style.width).toBe('320px');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('400');

    window.innerWidth = 1920;
    await fireEvent(window, new Event('resize'));
    expect(slot().style.width).toBe('456px');
  });

  it('is not on a page with no second sidebar', () => {
    renderOnPage('/acme-corp/other');

    expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).not.toBeInTheDocument();
  });

  it('is not there until the access policy is ready', () => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: '/acme-corp/apps/1' });
    render(AppSidebarFixture, {
      config: configWith({ entries: groupEntries, access: policy([], false) }),
    });

    expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).not.toBeInTheDocument();
  });

  it('gives its width to the open rail, which covers all the second sidebar', async () => {
    renderOnPage();
    await drag(256, 356);

    await fireEvent.click(railOf());
    expect(railOf().style.width).toBe('356px');

    handle().focus();
    await userEvent.keyboard('{Home}');
    expect(slot().style.width).toBe('196px');
    expect(railOf().style.width).toBe('196px');
  });

  it('does not close the rail with a press', async () => {
    renderOnPage();
    await fireEvent.click(railOf());

    await fireEvent.pointerDown(handle(), { button: 0, isPrimary: true, clientX: 256 });

    expect(railOf()).toHaveAttribute('data-state', 'expanded');
  });
});

describe('a section with noRailItem', () => {
  const accountConfig = () =>
    configWith({
      sections: [
        { id: 'workspace', title: msg`Workspace` },
        { id: 'account', title: msg`Account`, noRailItem: true },
      ],
      entries: [
        entry({ permission: undefined }),
        entry({
          section: 'account',
          title: msg`Profile`,
          url: 'account/profile',
          pattern: [':workspaceSlug', 'account', 'profile'],
          permission: undefined,
        }),
        entry({
          section: 'account',
          title: msg`Danger zone`,
          url: 'account/danger-zone',
          pattern: [':workspaceSlug', 'account', 'danger-zone'],
          permission: undefined,
          danger: true,
        }),
      ],
    });

  const openAt = (pathname: string) => {
    navigator.restore();
    navigator = installTestNavigator({ pathname });
    render(AppSidebarFixture, { config: accountConfig() });
  };

  it('fills the second sidebar on its pages, and selects no row of the rail', () => {
    openAt('/acme-corp/account/profile');

    const aside = within(secondSidebar());
    expect(aside.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(aside.getByRole('button', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(within(railOf()).queryByRole('button', { name: /Account/ })).not.toBeInTheDocument();
    expect(
      within(railOf())
        .getAllByRole('button')
        .filter(button => button.getAttribute('aria-current') === 'page'),
    ).toHaveLength(0);
  });

  it('opens a page of the section from the second sidebar', async () => {
    openAt('/acme-corp/account/profile');

    await userEvent.click(within(secondSidebar()).getByRole('button', { name: 'Danger zone' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/account/danger-zone', undefined);
  });

  it('shows a danger link apart and in red, also while it is the current one', () => {
    openAt('/acme-corp/account/danger-zone');

    const danger = within(secondSidebar()).getByRole('button', { name: 'Danger zone' });
    expect(danger).toHaveClass('text-destructive');
    expect(danger).toHaveAttribute('aria-current', 'page');
    expect(danger.closest('li')).toHaveClass('border-t');
    expect(within(secondSidebar()).getByRole('button', { name: 'Profile' })).not.toHaveClass(
      'text-destructive',
    );
  });

  describe('in the sheet of a phone', () => {
    const matchMedia = window.matchMedia;

    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
    });

    afterEach(() => {
      window.matchMedia = matchMedia;
    });

    const openSheet = async (pathname: string) => {
      navigator.restore();
      navigator = installTestNavigator({ pathname });
      render(AppSidebarSheetFixture, { config: accountConfig() });
      await userEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }));
    };

    it('has no handle to resize, and keeps the sheet of the design', async () => {
      localStorage.setItem('scylla.shell.second-sidebar-width', '400');
      await openSheet('/acme-corp/secrets');

      expect(await screen.findByRole('button', { name: 'Secrets' })).toBeInTheDocument();
      expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).not.toBeInTheDocument();
      expect(document.querySelector('[data-mobile="true"]')).toHaveStyle('--sidebar-width: 18rem');
      localStorage.clear();
    });

    it('shows its links on its pages, with a danger link in red while it is current', async () => {
      await openSheet('/acme-corp/account/danger-zone');

      const danger = await screen.findByRole('button', { name: 'Danger zone' });
      expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
      expect(danger).toHaveAttribute('data-active', 'true');
      expect(danger).toHaveClass('data-[active=true]:text-destructive');
      expect(danger).not.toHaveClass('data-[active=true]:text-sidebar-accent-foreground');
    });

    it('hides its links on the other pages', async () => {
      await openSheet('/acme-corp/secrets');

      expect(await screen.findByRole('button', { name: 'Secrets' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();
    });

    it('closes after a click on a link, also when the page stays mounted', async () => {
      await openSheet('/acme-corp/account/profile');

      await userEvent.click(await screen.findByRole('button', { name: 'Danger zone' }));

      expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/account/danger-zone', undefined);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  it('leaves the second sidebar to the other sections on their pages', () => {
    openAt('/acme-corp/secrets');

    expect(within(secondSidebar()).getByRole('heading', { name: 'Secrets' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();
  });
});
