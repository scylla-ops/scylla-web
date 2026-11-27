import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/svelte';
import { expectNoLayoutShift } from '@test/layout.ts';
import { render } from '@test/render.ts';
import StableLabel from './StableLabel.svelte';
import StableLabelFixture from './StableLabel.fixture.svelte';

describe('StableLabel', () => {
  it('keeps the other texts in its cell, invisible and hidden from a screen reader', () => {
    const { container } = render(StableLabel, { text: 'Save', reserve: ['Save', 'Saving...'] });

    const reserved = screen.getByText('Saving...');
    expect(reserved).toHaveClass('invisible');
    expect(reserved).toHaveAttribute('aria-hidden', 'true');
    // The text that shows is not repeated as a reserved one.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('names the button with the text that shows', async () => {
    const { rerender } = render(StableLabelFixture);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    await rerender({ pending: true });

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('shows a spinner in place of a busy text, and the text stays its name', () => {
    render(StableLabel, { text: 'Create', busy: true });

    expect(screen.getByText('Create')).toHaveClass('opacity-0');
    expect(document.querySelector('svg.animate-spin')).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not move the button beside it when the text changes', async () => {
    const { rerender } = render(StableLabelFixture);

    await expectNoLayoutShift(
      () => rerender({ pending: true }),
      screen.getByRole('button', { name: 'Cancel' }),
      { align: 'end' },
    );
  });
});
