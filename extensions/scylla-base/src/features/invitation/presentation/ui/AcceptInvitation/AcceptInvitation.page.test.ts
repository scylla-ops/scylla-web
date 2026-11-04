import { describe, it, expect, vi, afterEach } from 'vitest';
import type * as Login from '@base/features/login';
import { screen, waitFor } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import AcceptInvitationPage from './AcceptInvitation.page.svelte';

const hasSession = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock('@base/features/login', async original => ({
  ...(await original<typeof Login>()),
  hasSession,
}));

let teardown: Array<() => void> = [];
let accept: ReturnType<typeof vi.fn>;
let navigator: ReturnType<typeof installTestNavigator>;

const openAt = (
  url: string,
  { signedIn = true, refusal }: { signedIn?: boolean; refusal?: ScyllaError } = {},
) => {
  history.replaceState(null, '', url);
  hasSession.mockResolvedValue(signedIn);
  accept = refusal ? vi.fn().mockRejectedValue(refusal) : vi.fn().mockResolvedValue('ws-2');
  const getMine = vi.fn().mockResolvedValue([{ id: 'ws-2', name: 'Globex', slug: 'globex' }]);
  const cache = withQueryClient();
  navigator = installTestNavigator();
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      invitation: { invitationRepository: { accept } },
      organization: { organizationRepository: { getMine } },
    }),
  ];
  render(AcceptInvitationPage);
};

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

describe('AcceptInvitationPage', () => {
  it('accepts the link of a signed-in user, then opens the workspace', async () => {
    openAt('/accept-invitation#token=tok-1');

    await waitFor(() => expect(accept).toHaveBeenCalledWith('tok-1'));
    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/globex/projects', { replace: true }),
    );
    expect(contextStore.getState().organization).toEqual({
      id: 'ws-2',
      name: 'Globex',
      slug: 'globex',
    });
  });

  it('asks a signed-out person to sign in or to create an account, with the invitation', async () => {
    openAt('/accept-invitation#token=tok-1', { signedIn: false });

    expect(await screen.findByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up#invitation=tok-1',
    );
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toMatch(
      /^\/login#next=/,
    );
    expect(accept).not.toHaveBeenCalled();
  });

  it('says that a refused link is not valid', async () => {
    openAt('/accept-invitation#token=used', {
      refusal: new ScyllaError('the invitation is used', { code: 'FAILED_PRECONDITION' }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation is not valid any more',
    );
  });
});
