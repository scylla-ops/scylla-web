import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import AddAgentDialog from './AddAgentDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const app = (connected: boolean) => ({
  id: 'a1',
  workspaceId: 'ws-1',
  name: 'agent-1',
  runner: true,
  connected,
  lastSeenAt: connected ? '2026-01-01T00:00:00.000Z' : '',
  host: connected
    ? {
        version: '0.1.0',
        os: 'linux',
        arch: 'x86_64',
        hostname: 'host-1',
        cpuCount: 8,
        totalMemoryMb: 16384,
        capacity: 2,
        containerRuntime: 'docker',
      }
    : null,
  createdAt: '2026-01-01T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
});

let teardown: Array<() => void> = [];

const setUp = () => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: {
            kind: 'restricted',
            permissions: [Permission.CREATE_APP, Permission.READ_APP],
          },
        },
      ],
    },
  });
  const apps = {
    createApp: vi.fn().mockResolvedValue({
      app: app(false),
      joinCode: { code: 'JOIN-42', expiresAt: new Date(Date.now() + 900_000).toISOString() },
      accessGranted: true,
    }),
    getApp: vi
      .fn()
      .mockResolvedValueOnce({ app: app(false), keys: [] })
      .mockResolvedValue({
        app: app(true),
        keys: [{ id: 'k1', label: 'host-1', createdAt: '', revokedAt: '', lastUsedAt: '' }],
      }),
  };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [
        { id: 'p-1', name: 'api' },
        { id: 'p-2', name: 'web' },
      ],
      pagination: { page: 1, pageSize: 100, total: 2 },
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      apps: { appsRepository: apps },
      project: { projectRepository: projects },
    }),
  ];
  render(AddAgentDialog, { open: true, setOpen: vi.fn(), workspaceId: 'ws-1' });
  return { apps };
};

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AddAgentDialog', () => {
  it('names the agent, shows its install command, and waits for its connection', async () => {
    const { apps } = setUp();
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog');
    await focusSettled();

    await user.type(within(dialog).getByLabelText('Name'), 'agent-1');
    await user.click(within(dialog).getByRole('button', { name: 'Add agent' }));

    await waitFor(() => expect(apps.createApp).toHaveBeenCalledWith('ws-1', 'agent-1', true, []));
    expect(await screen.findByText('Install agent-1')).toBeInTheDocument();
    expect(screen.getByText(/install\.sh \| sh -s -- JOIN-42/)).toBeInTheDocument();
    expect(screen.getByText('Waiting for the agent…')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Windows/ }));
    expect(screen.getByText(/install\.ps1\)\)\) -JoinCode JOIN-42/)).toBeInTheDocument();

    expect(await screen.findByText('agent-1 is online', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Connected from host-1')).toBeInTheDocument();
    expect(
      screen.getByText(/linux\/x86_64 · 8 CPU · 16 GB · 2 jobs at once · docker/),
    ).toBeInTheDocument();
  });

  it('gives the agent the projects that the user chose', async () => {
    const { apps } = setUp();
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog');
    await focusSettled();

    await user.type(within(dialog).getByLabelText('Name'), 'agent-1');
    await user.click(within(dialog).getByRole('button', { name: 'Change' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Some projects' }));
    expect(within(dialog).getByRole('button', { name: 'Add agent' })).toBeDisabled();
    await user.click(await within(dialog).findByRole('checkbox', { name: 'api' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add agent' }));

    await waitFor(() =>
      expect(apps.createApp).toHaveBeenCalledWith('ws-1', 'agent-1', true, ['p-1']),
    );
    expect(screen.queryByText('Added without access')).not.toBeInTheDocument();
  });

  it('warns when the new agent got no access', async () => {
    const { apps } = setUp();
    apps.createApp.mockResolvedValueOnce({
      app: app(false),
      joinCode: { code: 'JOIN-42', expiresAt: new Date(Date.now() + 900_000).toISOString() },
      accessGranted: false,
    });
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog');
    await focusSettled();

    await user.type(within(dialog).getByLabelText('Name'), 'agent-1');
    await user.click(within(dialog).getByRole('button', { name: 'Add agent' }));

    expect(await screen.findByText('Added without access')).toBeInTheDocument();
    expect(screen.getByText(/could not give agent-1 its access/)).toBeInTheDocument();
  });
});
