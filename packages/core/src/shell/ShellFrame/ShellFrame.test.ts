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

  it('renders the overlays that the modules give', () => {
    render(ShellFrameFixture);

    expect(screen.getByText('stub')).toBeInTheDocument();
  });
});
