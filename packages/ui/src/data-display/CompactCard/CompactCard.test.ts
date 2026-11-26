import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, textSnippet } from '@test/render.ts';
import CompactCard from './CompactCard.svelte';

describe('CompactCard', () => {
  it('shows the icon, the title, the badge, the subtitle, the actions and the footer', () => {
    render(CompactCard, {
      title: 'Payments',
      icon: textSnippet('icon'),
      badge: textSnippet('2 failing'),
      subtitle: textSnippet('acme/payments'),
      actions: textSnippet('menu'),
      footer: textSnippet('Last job 2 min ago'),
    });

    expect(screen.getByText('Payments')).toHaveAttribute('title', 'Payments');
    for (const text of ['icon', '2 failing', 'acme/payments', 'menu', 'Last job 2 min ago']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('marks a selected card', () => {
    const { container } = render(CompactCard, {
      title: 'Payments',
      icon: textSnippet('icon'),
      selected: true,
    });

    expect(container.querySelector('[data-slot="compact-card"]')).toHaveAttribute('data-selected');
  });

  it('gives a click to its owner', async () => {
    const onclick = vi.fn();
    render(CompactCard, { title: 'Payments', icon: textSnippet('icon'), interactive: true, onclick });

    await userEvent.click(screen.getByText('Payments'));

    expect(onclick).toHaveBeenCalledOnce();
  });
});
