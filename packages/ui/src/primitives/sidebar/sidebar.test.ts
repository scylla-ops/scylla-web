import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import SidebarFixture from './sidebar.fixture.svelte';

describe('Sidebar', () => {
  it('keeps its open state in memory, and writes no cookie', async () => {
    const { container } = render(SidebarFixture);
    const sidebar = container.querySelector('[data-slot="sidebar"]');
    const rail = screen.getByRole('button', { name: 'Toggle the sidebar' });

    await userEvent.click(rail);
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    await userEvent.click(rail);
    expect(sidebar).toHaveAttribute('data-state', 'expanded');
    expect(document.cookie).toBe('');
  });
});
