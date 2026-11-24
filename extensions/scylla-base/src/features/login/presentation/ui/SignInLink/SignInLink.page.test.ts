import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import SignInLinkPage from './SignInLink.page.svelte';

const pending = {
  providerName: 'GitHub',
  email: 'lina@acme.dev',
  displayName: 'lina-m',
};

let teardown: Array<() => void> = [];
let assign: ReturnType<typeof vi.fn>;

const open = (
  pendingLink = vi.fn().mockResolvedValue(pending),
  linkPendingIdentity = vi.fn().mockResolvedValue('http://localhost/acme'),
) => {
  assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  const cache = withQueryClient();
  const restore = withRegistry({
    login: { loginRepository: { pendingLink, linkPendingIdentity } },
  });
  teardown = [cache.restore, restore, () => vi.unstubAllGlobals()];
  render(SignInLinkPage);
  return { pendingLink, linkPendingIdentity };
};

const submit = async (password: string) => {
  await userEvent.type(await screen.findByLabelText('Password of lina@acme.dev'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Link GitHub and sign in' }));
};

afterEach(() => teardown.forEach(restore => restore()));

describe('SignInLinkPage', () => {
  it('names the two accounts, links with the password, and goes to the page of the start', async () => {
    const { linkPendingIdentity } = open();

    expect(await screen.findByRole('heading', { name: 'You already have an account' })).toBeVisible();
    expect(screen.getByText('lina-m')).toBeInTheDocument();
    expect(screen.getByText('Scylla account')).toBeInTheDocument();
    await submit('a good long password');

    await vi.waitFor(() => expect(linkPendingIdentity).toHaveBeenCalledOnce());
    expect(linkPendingIdentity.mock.calls[0]?.[0]).toBe('a good long password');
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('http://localhost/acme'));
  });

  it('shows a wrong password in the page, and the person tries again', async () => {
    open(
      undefined,
      vi.fn().mockRejectedValue(
        new ScyllaError('the password is not valid', {
          code: 'FAILED_PRECONDITION',
          reason: 'WRONG_PASSWORD',
          raw: true,
        }),
      ),
    );

    await submit('not the password');

    expect(await screen.findByRole('alert')).toHaveTextContent('This password is not valid');
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Link GitHub and sign in' })).toBeInTheDocument();
  });

  it('offers a way out, with no link', async () => {
    open();

    const out = await screen.findByRole('link', { name: 'This is not my account' });

    expect(out).toHaveAttribute('href', '/login');
  });

  it('says that the request expired when the server has no such link', async () => {
    open(vi.fn().mockRejectedValue(new ScyllaError('gone', { code: 'NOT_FOUND', raw: true })));

    expect(await screen.findByRole('heading', { name: 'The sign-in request expired' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Start again' })).toHaveAttribute('href', '/login');
  });

  it('says that the request expired when the link ends during the password', async () => {
    open(
      undefined,
      vi.fn().mockRejectedValue(new ScyllaError('gone', { code: 'NOT_FOUND', raw: true })),
    );

    await submit('a good long password');

    expect(await screen.findByRole('heading', { name: 'The sign-in request expired' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the link when the network fails, and the person tries again', async () => {
    const pendingLink = vi
      .fn()
      .mockRejectedValueOnce(new ScyllaError('no answer', { code: 'UNAVAILABLE', raw: true }))
      .mockResolvedValue(pending);
    open(pendingLink);

    expect(await screen.findByRole('heading', { name: 'Scylla does not answer' })).toBeVisible();
    expect(screen.queryByText('The sign-in request expired')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'You already have an account' })).toBeVisible();
  });
});
