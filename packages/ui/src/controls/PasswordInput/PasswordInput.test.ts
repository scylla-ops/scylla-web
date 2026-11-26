import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import PasswordInput from './PasswordInput.svelte';
import PasswordInputFixture from './PasswordInput.fixture.svelte';

describe('PasswordInput', () => {
  it('hides the text by default', () => {
    render(PasswordInput, { id: 'pw', value: 'secret', autocomplete: 'current-password' });

    const input = document.getElementById('pw') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows and hides the text with the button', async () => {
    render(PasswordInput, { id: 'pw', value: 'secret' });
    const input = document.getElementById('pw') as HTMLInputElement;

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input.value).toBe('secret');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('is a button that submits no form on Enter and hides the text after a submit', async () => {
    const { submitted } = renderFixture();
    const input = document.getElementById('pw') as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: 'Show password' });

    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(submitted()).toBe(0);
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(submitted()).toBe(1);
    expect(input).toHaveAttribute('type', 'password');
  });
});

const renderFixture = () => {
  let count = 0;
  render(PasswordInputFixture, { onSubmit: () => (count += 1) });
  return { submitted: () => count };
};
