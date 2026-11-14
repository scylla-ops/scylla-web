import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import GitHubCallbackPage from './GitHubCallback.page.svelte';

const SEARCH = '?installation_id=42&setup_action=install&code=gh-code&state=s-1';
const AUTHORIZE = 'https://github.com/login/oauth/authorize?client_id=Iv1&state=s-1.42';

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

const connected = (id: string, workspaceId: string) => ({
  kind: 'connected',
  connection: { id, workspaceId, account: 'acme-labs' },
});

const refusal = (reason: string) =>
  new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, raw: true });

afterEach(() => {
  teardown.forEach(restore => restore());
  vi.unstubAllGlobals();
});

describe('GitHubCallbackPage', () => {
  it('sends the values of GitHub one time, then opens the page of the workspace of the connection', async () => {
    const completeGitHubInstall = vi.fn().mockResolvedValue(connected('c-9', 'ws-2'));
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

  it('sends an install with no code to the authorize page of GitHub, and stays on the wait', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const completeGitHubInstall = vi
      .fn()
      .mockResolvedValue({ kind: 'authorize', authorizeUrl: AUTHORIZE });
    const { navigate } = open(
      completeGitHubInstall,
      '?installation_id=42&setup_action=update&state=s-1',
    );

    await waitFor(() => expect(assign).toHaveBeenCalledWith(AUTHORIZE));
    expect(completeGitHubInstall).toHaveBeenCalledWith({
      state: 's-1',
      installationId: '42',
      code: '',
      setupAction: 'update',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Connecting to GitHub…');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('completes the install with the code of the authorize page and the state that carries the installation', async () => {
    const completeGitHubInstall = vi.fn().mockResolvedValue(connected('c-9', 'ws-1'));
    const { navigate } = open(completeGitHubInstall, '?code=gh-code&state=s-1.42');

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/acme/settings/integrations?connected=c-9', {
        replace: true,
      }),
    );
    expect(completeGitHubInstall).toHaveBeenCalledWith({
      state: 's-1.42',
      installationId: '',
      code: 'gh-code',
      setupAction: '',
    });
  });

  it('refreshes the connection after a change on GitHub, then opens its page with no next step', async () => {
    const completeGitHubInstall = vi.fn().mockResolvedValue(connected('c-9', 'ws-2'));
    const { navigate } = open(
      completeGitHubInstall,
      '?code=gh-code&installation_id=42&setup_action=update',
    );

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/labs/settings/integrations', { replace: true }),
    );
    expect(completeGitHubInstall).toHaveBeenCalledWith({
      state: '',
      installationId: '42',
      code: 'gh-code',
      setupAction: 'update',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['a refusal of the refresh', '?code=gh-code&installation_id=42&setup_action=update', 1],
    ['an installation with no code', '?installation_id=42&setup_action=update', 0],
    ['a code with no installation', '?code=gh-code', 0],
  ])(
    'says that a change on GitHub is saved after %s, with no error',
    async (_case, search, calls) => {
      const completeGitHubInstall = vi
        .fn()
        .mockRejectedValue(new ScyllaError('denied', { code: 'PERMISSION_DENIED' }));
      open(completeGitHubInstall, search);

      expect(await screen.findByText('Your changes on GitHub are saved')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Scylla uses the new settings of the installation.',
      );
      expect(screen.getByRole('link', { name: 'Open Integrations' })).toHaveAttribute(
        'href',
        '/acme/settings/integrations',
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(completeGitHubInstall).toHaveBeenCalledTimes(calls);
    },
  );

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

  it('calls nothing for a link with no value of GitHub', async () => {
    const completeGitHubInstall = vi.fn();
    open(completeGitHubInstall, '');

    expect(await screen.findByRole('alert')).toHaveTextContent('The link expired. Start again.');
    expect(completeGitHubInstall).not.toHaveBeenCalled();
  });
});
