import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { VcsAppEntity } from '@base/features/integrations/domain/entities/vcs-app.entity.ts';
import GitProvidersPage from './GitProviders.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const POST_URL = 'https://github.com/organizations/acme/settings/apps/new?state=s-1';
const MANIFEST = '{"name":"Scylla ci.acme.dev"}';

const vcsApp = (patch: Partial<VcsAppEntity> = {}): VcsAppEntity => ({
  id: 'app-1',
  provider: 'github',
  appId: '77',
  slug: 'scylla-acme',
  name: 'Scylla acme',
  owner: 'acme',
  webUrl: 'https://github.com/apps/scylla-acme',
  webhookUrl: 'https://ci.acme.dev/integrations/github/app-1/webhook',
  lastDeliveryAt: new Date(Date.now() - 120_000).toISOString(),
  lastDeliveryStatus: 202,
  managedBySettings: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (app: VcsAppEntity | null, permissions: Permission[] | 'all' = 'all') => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all' ? { kind: 'fullControl' } : { kind: 'restricted', permissions },
        },
      ],
    },
  } as never);
  repository = {
    get: vi.fn().mockResolvedValue(app),
    startGitHubManifest: vi
      .fn()
      .mockResolvedValue({ postUrl: POST_URL, manifest: MANIFEST, expiresAt: '' }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ integrations: { vcsAppRepository: repository } })];
  render(GitProvidersPage);
};

const refusal = (reason: string) =>
  new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, raw: true });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
  vi.restoreAllMocks();
});

describe('Git providers page', () => {
  it('creates the App of an organization: the page posts the manifest to GitHub', async () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    setUp(null);
    const user = userEvent.setup();

    expect(await screen.findByText('GitHub App')).toBeInTheDocument();
    expect(screen.getByLabelText('Public URL of Scylla')).toHaveValue(window.location.origin);
    expect(screen.getByText('GitHub Enterprise Server')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Organization'), 'acme');
    await user.click(screen.getByRole('button', { name: 'Create GitHub App' }));

    expect(repository.startGitHubManifest).toHaveBeenCalledWith('acme');
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    const form = submit.mock.contexts[0] as HTMLFormElement;
    expect(form.method).toBe('post');
    expect(form.action).toBe(POST_URL);
    const field = form.querySelector<HTMLInputElement>('input[name="manifest"]');
    expect(field?.type).toBe('hidden');
    expect(field?.value).toBe(MANIFEST);
  });

  it('needs the login of the organization before it starts', async () => {
    setUp(null);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Create GitHub App' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Type the login of the organization.',
    );
    expect(repository.startGitHubManifest).not.toHaveBeenCalled();
  });

  it('shows a refusal of the server beside the button', async () => {
    setUp(null);
    repository.startGitHubManifest.mockRejectedValue(refusal('SECRET_KEY_MISSING'));
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Organization'), 'acme');
    await user.click(screen.getByRole('button', { name: 'Create GitHub App' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server has no key for the secrets. Set SCYLLA_SECRET_KEY, then try again.',
    );
  });

  it('keeps the button inert for a person who cannot change the App', async () => {
    setUp(null, [Permission.MANAGE_INSTANCE_SETTINGS]);
    const user = userEvent.setup();

    const create = await screen.findByRole('button', { name: 'Create GitHub App' });
    expect(create).toHaveAttribute('aria-disabled', 'true');
    await user.click(create);
    expect(repository.startGitHubManifest).not.toHaveBeenCalled();
  });

  it('shows the App, its webhook and its last delivery, and removes it after a confirmation', async () => {
    setUp(vcsApp());
    const user = userEvent.setup();

    expect(await screen.findByText('Scylla acme')).toBeInTheDocument();
    expect(
      screen.getByText('github.com/apps/scylla-acme · App ID 77 · owner acme'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('https://ci.acme.dev/integrations/github/app-1/webhook'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^202 · 2 min/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/apps/scylla-acme',
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('The App stays on GitHub: delete it there.');
    await user.click(within(dialog).getByRole('button', { name: 'Remove the App' }));

    await waitFor(() => expect(repository.remove).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('GitHub App')).toBeInTheDocument();
  });

  it('shows the App of the settings as read only', async () => {
    setUp(vcsApp({ id: '', managedBySettings: true, owner: '', lastDeliveryAt: undefined }));

    expect(
      await screen.findByText(
        'This App comes from the settings of the server (SCYLLA_GITHUB_APP_*). Change it there.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('No webhook yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });
});
