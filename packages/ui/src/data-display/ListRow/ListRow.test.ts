import { screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { render, textSnippet } from '@test/render.ts';
import ListRow from './ListRow.svelte';

const props = {
  title: 'Payments',
  icon: textSnippet('icon'),
  badge: textSnippet('2 failing'),
  subtitle: textSnippet('acme/payments'),
  meta: textSnippet('Last job 2 min ago'),
  actions: textSnippet('menu'),
};

const rowOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="list-row"]') as HTMLElement;

describe('ListRow', () => {
  it('shows each part on one line on a wide screen', () => {
    const { container } = render(ListRow, props);

    const row = rowOf(container);
    expect(row).not.toHaveAttribute('data-stacked');
    expect(screen.getByText('Payments')).toHaveAttribute('title', 'Payments');
    // The details are after the title, and the time is at the end, before the actions.
    const texts = [...row.querySelectorAll('span')].map(span => span.textContent);
    expect(texts.indexOf('Last job 2 min ago')).toBeGreaterThan(texts.indexOf('acme/payments'));
    expect(texts.indexOf('menu')).toBeGreaterThan(texts.indexOf('Last job 2 min ago'));
  });

  it('puts the details under the title on a phone', () => {
    const { container } = render(ListRow, { ...props, stacked: true });

    expect(rowOf(container)).toHaveAttribute('data-stacked');
    const title = screen.getByText('Payments');
    const details = screen.getByText('acme/payments').parentElement;
    expect(details).toContainElement(screen.getByText('Last job 2 min ago'));
    expect(details).not.toContainElement(title);
  });

  it('marks a selected row', () => {
    const { container } = render(ListRow, { ...props, selected: true });

    expect(rowOf(container)).toHaveAttribute('data-selected');
  });
});
