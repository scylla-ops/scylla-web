import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import GitHubCallbackPage from './GitHubCallback.page.svelte';

const SEARCH = '?installation_id=42&setup_action=install&code=gh-code&state=s-1';

let teardown: Array<() => void> = [];

const open = (completeGitHubInstall: ReturnType<typeof vi.fn>, search = SEARCH) => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/integrations/github/callback', search });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      integrations: { vcsConnectionRepository: { completeGitHubInstall } },
      workspace: {
        workspaceRepository: {
          getMine: vi.fn().mockResolvedValue([
            { id: 'ws-1', name: 'Acme', slug: 'acme', personalTokensEnabled: true },
            { id: 'ws-2', name: 'Labs', slug: 'labs', personalTokensEnabled: true },
          ]),
        },
      },
    }),
  ];
  render(GitHubCallbackPage);
  return navigator;
};

const refusal = (reason: string) =>
  new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, raw: true });

afterEach(() => teardown.forEach(restore => restore()));

describe('GitHubCallbackPage', () => {
  it('sends the values of GitHub one time, then opens the page of the workspace of the connection', async () => {
    const completeGitHubInstall = vi
      .fn()
      .mockResolvedValue({ id: 'c-9', workspaceId: 'ws-2', account: 'acme-labs' });
    const { navigate } = open(completeGitHubInstall);

    expect(screen.getByRole('status')).toHaveTextContent('Connecting to GitHub…');
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/labs/settings/integrations?connected=c-9', {
        replace: true,
      }),
    );
    expect(completeGitHubInstall).toHaveBeenCalledTimes(1);
    expect(completeGitHubInstall).toHaveBeenCalledWith({
      state: 's-1',
      installationId: '42',
      code: 'gh-code',
      setupAction: 'install',
    });
    expect(contextStore.getState().workspace.slug).toBe('labs');
  });

  it.each([
    ['STATE_EXPIRED', 'The link expired. Start again.'],
    ['INSTALLATION_NOT_VISIBLE', 'You cannot see this installation on GitHub.'],
    ['INSTALL_CANCELLED', 'The install was cancelled.'],
    ['INSTALL_PENDING_APPROVAL', 'An organization owner must approve the request on GitHub.'],
  ])(
    'says what went wrong for %s, with a way back to the Integrations page',
    async (reason, text) => {
      open(vi.fn().mockRejectedValue(refusal(reason)));

      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      expect(screen.getByRole('link', { name: 'Back to Integrations' })).toHaveAttribute(
        'href',
        '/acme/settings/integrations',
      );
    },
  );

  it('calls nothing for a link with no state', async () => {
    const completeGitHubInstall = vi.fn();
    open(completeGitHubInstall, '?installation_id=42');

    expect(await screen.findByRole('alert')).toHaveTextContent('The link expired. Start again.');
    expect(completeGitHubInstall).not.toHaveBeenCalled();
  });
});
