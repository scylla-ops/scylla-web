import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import ConnectGitLabDialog from './ConnectGitLabDialog.svelte';

const DAY = 24 * 60 * 60 * 1000;

const bot = (patch: Partial<VcsConnectionEntity> = {}): VcsConnectionEntity => ({
  id: 'c-2',
  workspaceId: 'ws-1',
  provider: 'gitlab',
  account: 'scylla-bot',
  accountKind: 'service_account',
  avatarUrl: '',
  state: 'active',
  stateReason: '',
  deliveryMode: 'webhook',
  pollIntervalSeconds: 120,
  allRepositories: false,
  repositoryCount: 8,
  projectCount: 0,
  tokenExpiresAt: new Date(Date.now() + 355 * DAY - 60_000).toISOString(),
  scopes: ['api'],
  missingPermissions: [],
  settingsUrl: 'https://gitlab.com/scylla-bot',
  createdBy: 'u-1',
  createdAt: new Date().toISOString(),
  ...patch,
});

let teardown: Array<() => void> = [];

const open = (
  repository: Record<string, ReturnType<typeof vi.fn>>,
  connection?: VcsConnectionEntity,
) => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ integrations: { vcsConnectionRepository: repository } }),
  ];
  const onOpenChange = vi.fn();
  // `props`: a bare `target` would be the mount option of Svelte.
  render(ConnectGitLabDialog, {
    props: { open: true, onOpenChange, target: { workspaceId: 'ws-1', connection } },
  });
  return { onOpenChange };
};

const refusal = (reason: string) =>
  new ScyllaError('refused', { code: 'FAILED_PRECONDITION', reason, raw: true });

afterEach(() => teardown.forEach(restore => restore()));

describe('ConnectGitLabDialog', () => {
  it('gives the three steps of the guide, and keeps self-managed for a later release', async () => {
    open({ connectGitLab: vi.fn() });

    const dialog = await screen.findByRole('dialog', { name: 'Connect GitLab.com' });
    expect(
      within(dialog).getByText('Create a service account in your top-level group.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Add it as Maintainer to the group, or to the projects.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Create a token for it with the scope api.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /GitLab\.com/ })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: /Self-managed/ })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('shows the refusal of GitLab under the field, and the dialog stays open', async () => {
    const connectGitLab = vi.fn().mockRejectedValue(refusal('TOKEN_SCOPE_MISSING'));
    const { onOpenChange } = open({ connectGitLab });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Token'), 'glpat-read-only');
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The token has no api scope.');
    expect(connectGitLab).toHaveBeenCalledWith({ workspaceId: 'ws-1', token: 'glpat-read-only' });
    expect(screen.getByLabelText('Token')).toHaveValue('');
    expect(screen.getByLabelText('Token')).toHaveAttribute('aria-invalid', 'true');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('shows the account, the scopes, the expiry, the projects and the warnings after the check', async () => {
    const connectGitLab = vi.fn().mockResolvedValue({
      connection: bot(),
      warnings: ['ROLE_DEVELOPER', 'NOT_A_SERVICE_ACCOUNT', 'A_NEWER_WARNING'],
    });
    const { onOpenChange } = open({ connectGitLab });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Token'), 'glpat-good');
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(await screen.findByText('scylla-bot')).toBeInTheDocument();
    expect(screen.getByText('Service account')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText(/· in 355 days$/)).toBeInTheDocument();
    expect(screen.getByText('8 projects')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Role Developer: Scylla can report, but cannot create the webhook or block merges.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This is not a service account or a bot. Reports stop when the person leaves the group.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('replaces the token of a connection, with no guide', async () => {
    const replaceGitLabToken = vi.fn().mockResolvedValue({
      connection: bot({ tokenExpiresAt: new Date(Date.now() + 6 * DAY - 60_000).toISOString() }),
      warnings: ['TOKEN_EXPIRES_SOON'],
    });
    open({ replaceGitLabToken }, bot());
    const user = userEvent.setup();

    const dialog = await screen.findByRole('dialog', { name: 'Replace the token of scylla-bot' });
    expect(within(dialog).queryByText('Before you start')).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Token'), 'glpat-new');
    await user.click(within(dialog).getByRole('button', { name: 'Replace token' }));

    await waitFor(() =>
      expect(replaceGitLabToken).toHaveBeenCalledWith({ id: 'c-2', token: 'glpat-new' }),
    );
    expect(await screen.findByText('The token expires in 6 days.')).toBeInTheDocument();
  });
});
