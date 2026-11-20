import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import GitHubManifestCallbackPage from './GitHubManifestCallback.page.svelte';

const SEARCH = '?code=c0de&state=s-1';

let teardown: Array<() => void> = [];

const open = (
  completeGitHubManifest: ReturnType<typeof vi.fn>,
  { search = SEARCH, slug = 'acme' }: { search?: string; slug?: string } = {},
) => {
  contextStore.setState({
    workspace: slug ? { id: 'ws-1', name: 'Acme', slug } : { id: null, name: null, slug: null },
  });
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/integrations/github/manifest', search });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      integrations: { vcsAppRepository: { completeGitHubManifest } },
      workspace: {
        workspaceRepository: {
          getMine: vi
            .fn()
            .mockResolvedValue([
              { id: 'ws-2', name: 'Labs', slug: 'labs', personalTokensEnabled: true },
            ]),
        },
      },
    }),
  ];
  render(GitHubManifestCallbackPage);
  return navigator;
};

const refusal = (reason: string) =>
  new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, raw: true });

afterEach(() => teardown.forEach(restore => restore()));

describe('GitHubManifestCallbackPage', () => {
  it('sends the code and the state one time, then opens the Git providers page', async () => {
    const completeGitHubManifest = vi.fn().mockResolvedValue({ id: 'app-1' });
    const { navigate } = open(completeGitHubManifest);

    expect(screen.getByRole('status')).toHaveTextContent('Creating the GitHub App…');
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/acme/instance/git-providers', { replace: true }),
    );
    expect(completeGitHubManifest).toHaveBeenCalledTimes(1);
    expect(completeGitHubManifest).toHaveBeenCalledWith({ code: 'c0de', state: 's-1' });
  });

  it('opens the page under the first workspace when none is active', async () => {
    const { navigate } = open(vi.fn().mockResolvedValue({ id: 'app-1' }), { slug: '' });

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/labs/instance/git-providers', { replace: true }),
    );
  });

  it.each([
    ['STATE_EXPIRED', 'The link expired. Create the App again.'],
    ['APP_EXISTS', 'This server has a GitHub App. Remove it first.'],
  ])('says what went wrong for %s, with a way back', async (reason, text) => {
    open(vi.fn().mockRejectedValue(refusal(reason)));

    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.getByRole('link', { name: 'Back to Git providers' })).toHaveAttribute(
      'href',
      '/acme/instance/git-providers',
    );
  });

  it('calls nothing for a link with no code', async () => {
    const completeGitHubManifest = vi.fn();
    open(completeGitHubManifest, { search: '?state=s-1' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The link expired. Create the App again.',
    );
    expect(completeGitHubManifest).not.toHaveBeenCalled();
  });
});
