import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import Textarea from './textarea.svelte';

describe('Textarea', () => {
  it('shows three lines at rest and keeps typed line breaks', async () => {
    render(Textarea, { 'aria-label': 'Notes' });
    const box = screen.getByRole('textbox', { name: 'Notes' });

    expect(box).toHaveAttribute('rows', '3');
    await userEvent.type(box, 'one{Enter}two');

    expect(box).toHaveValue('one\ntwo');
  });

  it('lets the user drag the bottom edge, and only that axis', () => {
    render(Textarea, { 'aria-label': 'Notes' });

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveClass('resize-y');
  });
});
