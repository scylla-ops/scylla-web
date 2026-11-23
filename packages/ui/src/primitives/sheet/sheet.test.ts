import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import SheetFixture from './sheet.fixture.svelte';

describe('SheetContent', () => {
  it('gives the page back to the pointer when it closes, before its exit animation ends', async () => {
    render(SheetFixture);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog', { name: 'Filters' });
    await waitFor(() => expect(document.body.style.pointerEvents).toBe('none'));

    // `fireEvent`: no timer runs between the close and the check, so no frame ends the animation.
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(document.body.style.pointerEvents).toBe('');
  });
});
