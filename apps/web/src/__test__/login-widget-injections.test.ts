import { describe, it, expect, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { setAppNavigator, setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { loadExtensions, setShellConfig, startCore } from '@scylla/core';
import { extensions } from '../extensions.ts';

/**
 * The reference case of `widgets_plan.md`, exercised at the only level that sees both
 * extensions together: `scylla-base`'s login page, changed by `scylla-cloud`'s widget
 * injections, loaded exactly as the real app loads them.
 */

afterEach(() => {
  setAppNavigator(null);
  setDependencyRegistry(null);
  setQueryClient(null);
  setShellConfig(null);
  document.body.innerHTML = '';
});

const openLogin = async () => {
  history.replaceState(null, '', '/login');
  const target = document.createElement('div');
  document.body.append(target);
  await startCore({ extensions, target });
};

describe('scylla-cloud\'s widget injections', () => {
  it('pass the loader\'s owner, dependency and conflict checks', () => {
    expect(() => loadExtensions(extensions)).not.toThrow();
  });
});

describe('the login page with scylla-cloud loaded', () => {
  it('shows the email field in place of the username field', async () => {
    await openLogin();

    const field = await screen.findByLabelText('Email');
    expect(field).toHaveAttribute('type', 'email');
  });

  it('shows a sign-up link below the card', async () => {
    await openLogin();

    expect(await screen.findByRole('button', { name: /Sign up/ })).toBeInTheDocument();
  });

  it('goes to the register page from the sign-up link', async () => {
    await openLogin();
    await screen.findByRole('button', { name: /Sign up/ });

    await userEvent.click(screen.getByRole('button', { name: /Sign up/ }));

    await waitFor(() => expect(window.location.pathname).toBe('/register'));
    expect(await screen.findByText('Create your account')).toBeInTheDocument();
  });
});
