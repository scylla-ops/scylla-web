import { describe, it, expect, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { setAppNavigator, setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { setShellConfig, startCore } from '@scylla/core';
import { extensions } from '../extensions.ts';

/** The server answers that the cookie gives no session. Every other call fails on the network. */
const serverWithNoSession = () =>
  vi.fn((input: string) =>
    input.endsWith('TokenService/Refresh')
      ? Promise.resolve(
          new Response(null, {
            status: 200,
            headers: {
              'content-type': 'application/grpc-web+proto',
              'grpc-status': '16',
              'grpc-message': 'no session cookie',
            },
          }),
        )
      : Promise.reject(new TypeError('Failed to fetch')),
  );

afterEach(() => {
  vi.unstubAllGlobals();
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

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('sends a signed-out user from a page of the shell to /login', async () => {
    vi.stubGlobal('fetch', serverWithNoSession());
    localStorage.removeItem('token');
    history.replaceState(null, '', '/acme/agents');
    const target = document.createElement('div');
    document.body.append(target);

    await startCore({ extensions, target });

    await expect.poll(() => window.location.pathname).toBe('/login');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('keeps a user on the page when the server does not answer on a first load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    history.replaceState(null, '', '/acme/agents');
    const target = document.createElement('div');
    document.body.append(target);

    await startCore({ extensions, target });

    expect(await screen.findByText('The server does not answer')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/acme/agents');
  });

  it('opens the public password reset pages without a session', async () => {
    localStorage.removeItem('token');
    history.replaceState(null, '', '/forgot-password');
    const target = document.createElement('div');
    document.body.append(target);

    await startCore({ extensions, target });

    expect(await screen.findByRole('heading', { name: 'Forgot password' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/forgot-password');
  });
});
