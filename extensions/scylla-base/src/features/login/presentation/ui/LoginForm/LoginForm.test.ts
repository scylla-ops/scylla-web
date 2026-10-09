import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.svelte.ts';
import LoginForm from './LoginForm.svelte';

describe('LoginForm', () => {
  it('the password field masks its input', () => {
    render(LoginForm, { handleSubmit: vi.fn() });
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('Sign in stays disabled until both fields are filled', async () => {
    const user = userEvent.setup();
    render(LoginForm, { handleSubmit: vi.fn() });
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Email or username'), 'ravenne');
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Password'), 'hunter2');
    expect(button).toBeEnabled();
  });

  it('submitting calls handleSubmit with the identifier and password', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(LoginForm, { handleSubmit });

    await user.type(screen.getByLabelText('Email or username'), 'ravenne');
    await user.type(screen.getByLabelText('Password'), 'hunter2');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(handleSubmit).toHaveBeenCalledWith('ravenne', 'hunter2');
  });

  it('isPending disables the Sign in button even with valid input', () => {
    render(LoginForm, { handleSubmit: vi.fn(), isPending: true });
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('lets the browser fill the saved account', () => {
    render(LoginForm, { handleSubmit: vi.fn() });

    expect(screen.getByLabelText('Email or username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('links to the password reset, right under the password field', () => {
    render(LoginForm, { handleSubmit: vi.fn() });

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});
