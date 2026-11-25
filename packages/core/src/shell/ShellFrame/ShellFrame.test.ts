import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import { ShieldCheckIcon } from '@lucide/svelte';
import { installTestNavigator } from '@test/navigator.ts';
import type { NavEntry } from '../../routing/compilation/nav-entries.ts';
import { setShellConfig } from '../shell-config.ts';
import Bar from '../__test__/Bar.fixture.svelte';
import Stub from '../__test__/Stub.fixture.svelte';
import ShellFrameFixture from './ShellFrame.fixture.svelte';

const toastSuccess = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: vi.fn() },
}));

let navigator: ReturnType<typeof installTestNavigator>;
const matchMedia = window.matchMedia;

const onPhone = () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  navigator = installTestNavigator();
  setShellConfig({
    entries: [],
    sections: [{ id: 'main', title: msg`Main` }],
    contributions: [{ overlays: [Stub] }],
  });
});

afterEach(() => {
  window.matchMedia = matchMedia;
  setShellConfig(null);
  navigator.restore();
});

describe('ShellFrame', () => {
  it('renders the page in the inset, beside the sidebars', () => {
    const { container } = render(ShellFrameFixture);

    expect(screen.getByText('page content').closest('main')).toHaveAttribute(
      'data-slot',
      'sidebar-inset',
    );
    expect(container.querySelector('[data-slot="sidebar-container"]')).toBeInTheDocument();
  });

  it('has one toggle on a large screen: the separator of the rail', () => {
    render(ShellFrameFixture);

    expect(screen.getByRole('button', { name: 'Toggle Sidebar' })).toHaveAttribute(
      'data-slot',
      'sidebar-rail-separator',
    );
  });

  it('keeps the sheet and its toggle on a phone, with no rail', () => {
    onPhone();
    const { container } = render(ShellFrameFixture);

    expect(screen.getByRole('button', { name: 'Toggle Sidebar' })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="sidebar-container"]')).not.toBeInTheDocument();
  });

  it('draws one light line below the band and the top bar on a large screen', () => {
    const { container } = render(ShellFrameFixture);

    expect(container.querySelector('[data-slot="sidebar-brand"]')).toHaveClass(
      'h-17',
      'border-b',
      'border-sidebar-border',
    );
    expect(screen.getByRole('banner')).toHaveClass('md:h-17', 'border-b', 'border-border');
    expect(screen.getByRole('banner').className).not.toMatch(/border-input/);
  });

  it('keeps the border line below the top bar on a phone, which has no band', () => {
    onPhone();
    const { container } = render(ShellFrameFixture);

    expect(container.querySelector('[data-slot="sidebar-brand"]')).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveClass('border-b', 'border-border');
  });

  it('renders the overlays that the modules give', () => {
    render(ShellFrameFixture);

    expect(screen.getByText('stub')).toBeInTheDocument();
  });

  it('keeps the padding of the pages when no overlay covers the bottom of the view', () => {
    render(ShellFrameFixture);

    const area = screen.getByText('page content').parentElement;
    expect(area?.style.getPropertyValue('--shell-bottom-inset')).toBe('0px');
    expect(area).toHaveClass('pb-[max(0.5rem,var(--shell-bottom-inset))]');
  });

  it('keeps free below the pages the largest band that an overlay covers', () => {
    setShellConfig({
      entries: [],
      sections: [{ id: 'main', title: msg`Main` }],
      contributions: [{ overlays: [Stub], bottomInset: 56 }, { bottomInset: 20 }],
    });
    render(ShellFrameFixture);

    const area = screen.getByText('page content').parentElement;
    expect(area?.style.getPropertyValue('--shell-bottom-inset')).toBe('56px');
    expect(area).toHaveClass(
      'pb-[max(0.5rem,var(--shell-bottom-inset))]',
      'md:pb-[max(2rem,var(--shell-bottom-inset))]',
    );
  });

  describe('the share button', () => {
    const onPage = (share?: true | { url: () => string | null }) => {
      navigator.restore();
      navigator = installTestNavigator({ share });
      setShellConfig({
        entries: [],
        sections: [{ id: 'main', title: msg`Main` }],
        contributions: [
          { topBarEnd: [Bar], shareHint: () => 'Hint of the first module' },
          { shareHint: () => 'Only members of Acme with access can open it.' },
        ],
      });
      render(ShellFrameFixture);
    };

    it('sits between the crumbs and the parts at the end of the top bar, on a page that shares', () => {
      onPage(true);

      const button = within(screen.getByRole('banner')).getByRole('button', { name: 'Copy link' });
      // The cell of the crumbs takes the free width, thus the button stays at the right end.
      expect(button.previousElementSibling).toHaveClass('min-w-0', 'flex-1');
      expect(button.nextElementSibling).toHaveTextContent('bar');
    });

    it('is not on a page that does not share', () => {
      onPage();

      expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    });

    it('hides while the page gives no link', () => {
      onPage({ url: () => null });

      expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    });

    it('copies the link of the page, with the hint of the last module that gives one', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
      onPage({ url: () => 'https://scylla.test/acme/dashboards/dash-7' });

      await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));

      expect(writeText).toHaveBeenCalledWith('https://scylla.test/acme/dashboards/dash-7');
      expect(toastSuccess).toHaveBeenCalledWith('Link copied', {
        description: 'Only members of Acme with access can open it.',
      });
    });
  });

  describe('in a space', () => {
    const entry = (section: string, title: string, url: string, mount: string): NavEntry => ({
      section,
      title: { id: title, message: title },
      mount,
      url,
      pattern: mount === 'admin' ? ['admin', url] : [':workspaceSlug', url],
    });

    beforeEach(() => {
      setShellConfig({
        entries: [
          entry('admin', 'Users', 'users', 'admin'),
          entry('admin', 'Roles', 'roles', 'admin'),
          entry('main', 'Secrets', 'secrets', 'workspace'),
        ],
        sections: [
          { id: 'main', title: msg`Main` },
          {
            id: 'admin',
            title: msg`Administration`,
            space: { icon: ShieldCheckIcon, bar: Bar },
          },
        ],
        contributions: [{ sidebarFooter: [Stub], topBarEnd: [Bar], brand: Bar }],
      });
    });

    it('shows the title and the bar of the space above one column with its links', () => {
      const { container } = render(ShellFrameFixture, { space: 'admin' });

      const title = container.querySelector('[data-slot="space-title"]');
      expect(title).toHaveClass('md:w-64', 'items-center', 'border-b', 'md:border-r');
      expect(within(title as HTMLElement).getByRole('heading')).toHaveTextContent(
        'Administration',
      );
      expect(container.querySelector('[data-slot="space-bar"]')).toHaveTextContent('bar');
      const column = container.querySelector('[data-slot="space-nav"]') as HTMLElement;
      expect(column).toHaveClass('w-64', 'border-r', 'bg-second-sidebar');
      expect(within(column).getAllByRole('button').map(link => link.textContent?.trim())).toEqual([
        'Users',
        'Roles',
      ]);
      expect(within(column).getByText('stub')).toBeInTheDocument();
    });

    it('has no rail, no brand, no crumbs and no end of the top bar', () => {
      const { container } = render(ShellFrameFixture, { space: 'admin' });

      expect(container.querySelector('[data-slot="sidebar-rail-panel"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-slot="sidebar-brand"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-slot="breadcrumb"]')).not.toBeInTheDocument();
      expect(screen.getAllByText('bar')).toHaveLength(1);
    });

    it('renders the page in the inset, beside the column', () => {
      render(ShellFrameFixture, { space: 'admin' });

      expect(screen.getByText('page content').closest('main')).toHaveAttribute(
        'data-slot',
        'sidebar-inset',
      );
    });

    it('keeps the frame of the app for a space that no section declares', () => {
      const { container } = render(ShellFrameFixture, { space: 'main' });

      expect(container.querySelector('[data-slot="space-frame"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-slot="sidebar-container"]')).toBeInTheDocument();
    });
  });
});
