import { screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { render, textSnippet } from '@test/render.ts';
import DropSlot from './DropSlot.svelte';

const slotOf = (container: HTMLElement) =>
  container.querySelector('[data-slot="drop-slot"]') as HTMLElement;

describe('DropSlot', () => {
  it('is a card by default, hidden from a screen reader', () => {
    const { container } = render(DropSlot, {});

    expect(slotOf(container)).toHaveAttribute('data-shape', 'card');
    expect(slotOf(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(['row', 'header', 'tile'] as const)('takes the shape of a %s', shape => {
    const { container } = render(DropSlot, { shape });

    expect(slotOf(container)).toHaveAttribute('data-shape', shape);
  });

  it('shows its text to each reader', () => {
    const { container } = render(DropSlot, { shape: 'header', children: textSnippet('Deploys') });

    expect(screen.getByText('Deploys')).toBeVisible();
    expect(slotOf(container)).not.toHaveAttribute('aria-hidden');
  });
});
