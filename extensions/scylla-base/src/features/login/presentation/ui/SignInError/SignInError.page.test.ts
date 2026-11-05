import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import SignInErrorPage from './SignInError.page.svelte';

let teardown: Array<() => void> = [];

const openAt = (
  url: string,
  listSignInMethods = vi.fn().mockResolvedValue({
    providers: [{ slug: 'okta', displayName: 'Okta', kind: 'oidc' }],
    signUpMode: 'closed',
  }),
) => {
  history.replaceState(null, '', url);
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ login: { loginRepository: { listSignInMethods } } })];
  render(SignInErrorPage);
};

const hrefOf = (name: string) =>
  new URL(screen.getByRole('link', { name }).getAttribute('href') ?? '', window.location.origin);

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

describe('SignInErrorPage', () => {
  it('names the provider, tells the code, and offers to try again', async () => {
    openAt('/sign-in-error?code=access_denied&provider=okta');

    expect(await screen.findByRole('heading', { name: 'You stopped the sign-in' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('You chose Cancel at Okta.');
    expect(screen.getByText('access_denied')).toBeInTheDocument();
    expect(hrefOf('Try again').pathname).toBe('/auth/okta/start');
    expect(hrefOf('Back to sign in').pathname).toBe('/login');
  });

  it('sends an expired request to the first page, with no start at the provider', async () => {
    openAt('/sign-in-error?code=state_expired&provider=okta');

    expect(await screen.findByRole('heading', { name: 'The sign-in request expired' })).toBeVisible();
    expect(hrefOf('Start again').pathname).toBe('/login');
    expect(screen.queryByRole('link', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers only the way back when the person cannot fix it', async () => {
    openAt('/sign-in-error?code=account_inactive&provider=okta');

    expect(await screen.findByRole('heading', { name: 'Your account is turned off' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Try again' })).not.toBeInTheDocument();
    expect(hrefOf('Back to sign in').pathname).toBe('/login');
  });

  it('shows no text of the URL: not a code, and not a provider', async () => {
    openAt('/sign-in-error?code=call-555&provider=call-555');

    expect(await screen.findByText('sign_in_failed')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The sign-in failed' })).toBeVisible();
    expect(screen.queryByText(/call-555/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('keeps the card when the server does not answer, and asks for nothing more', async () => {
    const listSignInMethods = vi.fn().mockRejectedValue(new Error('network'));
    openAt('/sign-in-error?code=provider_unavailable&provider=okta', listSignInMethods);

    expect(await screen.findByRole('heading', { name: 'Scylla cannot reach the provider' })).toBeVisible();
    expect(listSignInMethods).toHaveBeenCalledOnce();
    expect(hrefOf('Back to sign in').pathname).toBe('/login');
  });

  it('goes back to the account after a failed link, and tries the link again', async () => {
    openAt('/sign-in-error?code=provider_refused&provider=okta&link=true');

    expect(await screen.findByRole('heading', { name: 'The sign-in was refused at Okta' })).toBeVisible();
    expect(hrefOf('Back to your account').pathname).toBe('/account/security');
    const retry = hrefOf('Try again');
    expect(retry.searchParams.get('link')).toBe('true');
    expect(retry.searchParams.get('return_to')).toBe(`${window.location.origin}/account/security`);
  });
});
