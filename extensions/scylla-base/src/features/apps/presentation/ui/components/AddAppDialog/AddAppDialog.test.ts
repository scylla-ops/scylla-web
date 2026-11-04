import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import AddAppDialog from './AddAppDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const app = {
  id: 'app-1',
  workspaceId: 'ws-1',
  name: 'release-bot',
  runner: false,
  connected: false,
  lastSeenAt: '',
  host: null,
  createdAt: '2026-11-04T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
};

const limits = { preset: 'read_only', actions: [], projectIds: [] };

let teardown: Array<() => void> = [];

const setUp = () => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions: [Permission.CREATE_APP, Permission.READ_APP] },
        },
      ],
    },
  });
  const apps = {
    createApp: vi.fn().mockResolvedValue({
      app,
      joinCode: { code: 'JOIN-55', expiresAt: new Date(Date.now() + 900_000).toISOString() },
      accessGranted: true,
    }),
    grantRoles: vi.fn().mockResolvedValue(undefined),
    createToken: vi.fn().mockResolvedValue({
      token: {
        id: 't-1',
        name: 'deploy-script',
        hint: 'scya_...x7Q2',
        createdBy: 'u-1',
        createdAt: '2026-11-04T00:00:00.000Z',
        expiresAt: '2027-02-02T00:00:00.000Z',
        lastUsedAt: '',
        revokedAt: '',
        limits,
      },
      secret: 'scya_SECRET42',
    }),
    addCiIdentity: vi.fn().mockResolvedValue({
      id: 'ci-1',
      provider: 'github',
      issuer: 'https://token.actions.githubusercontent.com',
      repository: 'acme/release-tools',
      gitRef: 'refs/heads/main',
      environment: '',
      limits: { preset: 'full', actions: [], projectIds: [] },
      createdAt: '2026-11-04T00:00:00.000Z',
      lastUsedAt: '',
    }),
    getApp: vi
      .fn()
      .mockResolvedValueOnce({ app, keys: [] })
      .mockResolvedValue({
        app,
        keys: [{ id: 'k-1', label: 'backup-01', createdAt: '', revokedAt: '', lastUsedAt: '' }],
      }),
  };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [{ id: 'p-1', name: 'api' }],
      pagination: { page: 1, pageSize: 100, total: 1 },
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ apps: { appsRepository: apps }, project: { projectRepository: projects } }),
  ];
  render(AddAppDialog, {
    open: true,
    setOpen: vi.fn(),
    workspaceId: 'ws-1',
    workspaceName: 'acme',
  });
  return { apps };
};

const throughRoles = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = await screen.findByRole('dialog');
  await focusSettled();
  await user.type(within(dialog).getByLabelText('Name'), 'release-bot');
  await user.click(within(dialog).getByRole('button', { name: 'Next' }));
  return dialog;
};

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AddAppDialog', () => {
  it('makes an app with a read-only API token and shows its secret once', async () => {
    const { apps } = setUp();
    const user = userEvent.setup();
    const dialog = await throughRoles(user);

    await user.click(within(dialog).getByRole('button', { name: 'Next' }));
    await user.type(await within(dialog).findByLabelText('Token name'), 'deploy-script');
    await user.click(within(dialog).getByRole('button', { name: 'Create token' }));

    await waitFor(() =>
      expect(apps.createToken).toHaveBeenCalledWith('app-1', {
        name: 'deploy-script',
        expiry: 90,
        limits,
      }),
    );
    expect(apps.createApp).toHaveBeenCalledWith('ws-1', 'release-bot', false);
    expect(apps.grantRoles).toHaveBeenCalledWith('ws-1', 'app-1', [
      { projectId: null, role: 'member' },
    ]);
    expect(await screen.findByText('release-bot is ready')).toBeInTheDocument();
    expect(screen.getByText('scya_SECRET42')).toBeInTheDocument();
    expect(screen.getByText('Shown once')).toBeInTheDocument();
    expect(screen.getByText(/PipelineService\/ListWorkspacePipelines/)).toBeInTheDocument();
  });

  it('limits a token to custom actions when the user changes a box', async () => {
    const { apps } = setUp();
    const user = userEvent.setup();
    const dialog = await throughRoles(user);

    await user.click(within(dialog).getByRole('button', { name: 'Next' }));
    await user.type(await within(dialog).findByLabelText('Token name'), 'runner');
    await user.click(within(dialog).getByRole('button', { name: 'Advanced: choose the actions' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Run' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create token' }));

    await waitFor(() => expect(apps.createToken).toHaveBeenCalled());
    const input = apps.createToken.mock.calls[0][1];
    expect(input.limits.preset).toBe('custom');
    expect(input.limits.actions).toContain('scylla.pipelines.v1.PipelineService/RunPipeline');
    expect(input.limits.actions).toContain('scylla.projects.v1.ProjectService/GetProject');
  });

  it('trusts the jobs of a GitHub repository on a branch', async () => {
    const { apps } = setUp();
    const user = userEvent.setup();
    const dialog = await throughRoles(user);

    await user.click(within(dialog).getByRole('radio', { name: /CI identity/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Next' }));
    await user.type(await within(dialog).findByLabelText('Repository'), 'acme/release-tools');
    await user.click(within(dialog).getByRole('button', { name: 'Add identity' }));

    await waitFor(() =>
      expect(apps.addCiIdentity).toHaveBeenCalledWith('app-1', {
        provider: 'github',
        issuer: '',
        repository: 'acme/release-tools',
        gitRef: 'refs/heads/main',
        environment: '',
        limits: { preset: 'full', actions: [], projectIds: [] },
      }),
    );
    expect(
      await screen.findByText('The CI identity of acme/release-tools is ready'),
    ).toBeInTheDocument();
    expect(screen.getByText(/ExchangeCiToken/)).toBeInTheDocument();
  });

  it('gives a join code to a server with a key pair and waits for it', async () => {
    const { apps } = setUp();
    const user = userEvent.setup();
    const dialog = await throughRoles(user);

    await user.click(within(dialog).getByRole('radio', { name: /Key pair/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(apps.createApp).toHaveBeenCalledWith('ws-1', 'release-bot', false));
    expect(await screen.findByText('JOIN-55')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the server to join…')).toBeInTheDocument();
    expect(
      await screen.findByText('A server joined with a new key.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
