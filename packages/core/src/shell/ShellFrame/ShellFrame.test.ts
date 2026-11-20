import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { msg } from '@lingui/core/macro';
import { installTestNavigator } from '@test/navigator.ts';
import { setShellConfig } from '../shell-config.ts';
import Stub from '../__test__/Stub.fixture.svelte';
import ShellFrameFixture from './ShellFrame.fixture.svelte';

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
});
