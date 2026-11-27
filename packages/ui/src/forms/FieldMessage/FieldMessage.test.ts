import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FieldMessage from './FieldMessage.svelte';

describe('FieldMessage', () => {
  it('renders nothing for an empty message', () => {
    const { container } = render(FieldMessage, { message: false });

    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the message with its id and role', () => {
    render(FieldMessage, { message: 'Type a port.', id: 'port-error', role: 'alert' });

    const message = screen.getByRole('alert');
    expect(message).toHaveTextContent('Type a port.');
    expect(message).toHaveAttribute('id', 'port-error');
    expect(message).toHaveClass('text-destructive');
  });
});
