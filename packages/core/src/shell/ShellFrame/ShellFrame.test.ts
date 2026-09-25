import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { msg } from '@lingui/core/macro';
import { installTestNavigator } from '@test/navigator.ts';
import { setShellConfig } from '../shell-config.ts';
import Stub from '../__test__/Stub.fixture.svelte';
import ShellFrameFixture from './ShellFrame.fixture.svelte';

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  navigator = installTestNavigator();
  setShellConfig({
    entries: [],
    sections: [{ id: 'main', title: msg`Main` }],
    contributions: [{ overlays: [Stub] }],
  });
});

afterEach(() => {
  setShellConfig(null);
  navigator.restore();
});

describe('ShellFrame', () => {
  it('renders the page in the inset, beside the sidebar, with no second padded wrapper', () => {
    render(ShellFrameFixture);

    expect(screen.getByText('page content').closest('main')).toHaveAttribute(
      'data-slot',
      'sidebar-inset',
    );
    // The rail of the sidebar and the trigger of the top bar.
    expect(screen.getAllByRole('button', { name: 'Toggle Sidebar' })).toHaveLength(2);
  });

  it('renders the overlays that the modules give', () => {
    render(ShellFrameFixture);

    expect(screen.getByText('stub')).toBeInTheDocument();
  });
});
