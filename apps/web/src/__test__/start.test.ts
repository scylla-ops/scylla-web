import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { setAppNavigator, setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { setShellConfig, startCore } from '@scylla/core';
import { extensions } from '../extensions.ts';

afterEach(() => {
  setAppNavigator(null);
  setDependencyRegistry(null);
  setQueryClient(null);
  setShellConfig(null);
  document.body.innerHTML = '';
});

describe('startCore with the extensions of this build', () => {
  it('opens the login page of scylla-base on /login', async () => {
    history.replaceState(null, '', '/login');
    const target = document.createElement('div');
    document.body.append(target);

    await startCore({ extensions, target });

    expect(await screen.findByText('Login to your account')).toBeInTheDocument();
  });

  it('sends a signed-out user from a page of the shell to /login', async () => {
    localStorage.removeItem('token');
    history.replaceState(null, '', '/acme/agents');
    const target = document.createElement('div');
    document.body.append(target);

    await startCore({ extensions, target });

    await expect.poll(() => window.location.pathname).toBe('/login');
    expect(await screen.findByText('Login to your account')).toBeInTheDocument();
  });
});
