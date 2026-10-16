import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/svelte';
import { render } from '@test/render.svelte.ts';
import ResizablePanel from './ResizablePanel.fixture.svelte';

describe('ResizablePanel', () => {
  it('gives its handle the window splitter role, with the width as its value', () => {
    render(ResizablePanel);

    const handle = screen.getByRole('separator', { name: 'Resize panel' });
    expect(handle).toHaveAttribute('aria-valuenow', '300');
    expect(handle).toHaveAttribute('aria-valuemin', '200');
    expect(handle).toHaveAttribute('aria-valuemax', '600');
  });

  it('follows a pointer dragging its handle, and binds the new width', async () => {
    render(ResizablePanel);
    const handle = screen.getByRole('separator');

    await fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 500 });
    await fireEvent.pointerMove(handle, { pointerId: 1, clientX: 420 });
    await fireEvent.pointerUp(handle, { pointerId: 1, clientX: 420 });
    await fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0 });

    expect(screen.getByRole('status')).toHaveTextContent('380');
  });

  it('is resized from the keyboard', async () => {
    render(ResizablePanel);
    const handle = screen.getByRole('separator');

    await fireEvent.keyDown(handle, { key: 'End' });

    expect(handle).toHaveAttribute('aria-valuenow', '600');
  });
});
