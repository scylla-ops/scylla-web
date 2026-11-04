import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import AgentDetails from './AgentDetails.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const host = {
  version: '0.7.0',
  os: 'linux',
  arch: 'x86_64',
  hostname: 'build-linux-01.acme.lan',
  cpuCount: 8,
  totalMemoryMb: 16384,
  capacity: 2,
  containerRuntime: 'docker',
};

const agent = (patch: Record<string, unknown> = {}) => ({
  id: '01JBX7AAAAAAAAAAAAAAAAK2M',
  workspaceId: 'ws-1',
  name: 'build-linux-01',
  runner: true,
  connected: true,
  lastSeenAt: '2026-11-04T14:03:00.000Z',
  host,
  createdAt: '2026-10-12T00:00:00.000Z',
  runningJobs: 2,
  disabledAt: '',
  ...patch,
});

const key = (id: string, label: string, revokedAt = '') => ({
  id,
  label,
  createdAt: '2026-11-04T00:00:00.000Z',
  revokedAt,
  lastUsedAt: '',
});

const outcomes = (completed: number, failed: number) => ({
  completed,
  failed,
  cancelled: 0,
  orphaned: 0,
});

const ALL = [
  Permission.READ_APP,
  Permission.CREATE_APP,
  Permission.DELETE_APP,
  Permission.LIST_WORKSPACE_MEMBERS,
  Permission.MANAGE_WORKSPACE_GRANTS,
  Permission.MANAGE_PROJECT_GRANTS,
  Permission.LIST_JOBS_BY_WORKSPACE,
];

let teardown: Array<() => void> = [];
let apps: Record<string, ReturnType<typeof vi.fn>>;
let navigate: ReturnType<typeof vi.fn>;

const DEFAULT_KEYS = [
  key('k-active-01JBX9QF7T', 'build-linux-01.acme.lan'),
  key('k-old', 'build-old-01', '2026-11-04T00:00:00.000Z'),
];

const setUp = (details = agent(), permissions = ALL, keys = DEFAULT_KEYS, granted = true) => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });
  contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } });
  apps = {
    getApp: vi.fn().mockResolvedValue({
      app: details,
      keys,
    }),
    getAgentStats: vi.fn().mockResolvedValue({
      agentId: details.id,
      outcomes: outcomes(396, 16),
      medianMs: 192_000,
      p95Ms: 520_000,
      days: [
        { day: '2026-11-03T00:00:00.000Z', outcomes: outcomes(10, 1) },
        { day: '2026-11-04T00:00:00.000Z', outcomes: outcomes(12, 0) },
      ],
    }),
    listJobs: vi.fn().mockResolvedValue([
      {
        id: 'job-000001',
        pipelineId: 'pl-1',
        projectId: 'p-api',
        status: 'running',
        createdAt: '2026-11-04T14:00:00.000Z',
      },
    ]),
    createJoinCode: vi.fn().mockResolvedValue({
      code: 'JOIN-99',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    }),
    enableApp: vi.fn().mockResolvedValue({ ...details, disabledAt: '' }),
    disableApp: vi.fn().mockResolvedValue({ ...details, disabledAt: '2026-11-04T00:00:00.000Z' }),
    changeRunner: vi.fn().mockResolvedValue(undefined),
    renameKey: vi.fn().mockResolvedValue(key('k-active-01JBX9QF7T', 'gpu-box')),
    revokeKey: vi.fn().mockResolvedValue(undefined),
    deleteApp: vi.fn().mockResolvedValue(undefined),
  };
  const access = {
    listAccess: vi.fn(({ kind }: { kind: string }) =>
      Promise.resolve(
        kind === 'workspace' && granted
          ? [{ actorId: details.id, actorKind: 'app', displayName: '', handle: '', role: 'runner' }]
          : [],
      ),
    ),
  };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [
        { id: 'p-api', name: 'api' },
        { id: 'p-web', name: 'web' },
      ],
      pagination: { page: 1, pageSize: 100, total: 2 },
    }),
  };
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/agents/a1' });
  navigate = navigator.navigate;
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      apps: { appsRepository: apps },
      access: { accessRepository: access },
      project: { projectRepository: projects },
    }),
  ];
  render(AgentDetails, { appId: details.id });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AgentDetails', () => {
  it('shows the state, the stats, the machine, the jobs, the access and the keys', async () => {
    setUp();

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(screen.getByText('Running 2 jobs')).toBeInTheDocument();
    expect(await screen.findByText('412')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('396 of 412 completed')).toBeInTheDocument();
    expect(screen.getByText('3m 12s')).toBeInTheDocument();
    expect(screen.getByText('8m 40s')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '412 jobs in the last 30 days, by day' }),
    ).toBeInTheDocument();
    expect(screen.getByText('build-linux-01.acme.lan', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('16 GB')).toBeInTheDocument();
    expect(await screen.findByText('All projects of acme')).toBeInTheDocument();
    expect(await screen.findByText('api')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Revoked on/)).toBeInTheDocument();
  });

  it('gives a command to connect an agent that never said hello', async () => {
    setUp(agent({ connected: false, lastSeenAt: '', host: null, runningJobs: 0 }));

    expect(await screen.findByText('Connect this agent')).toBeInTheDocument();
    await waitFor(() => expect(apps.createJoinCode).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/JOIN-99/)).toBeInTheDocument();
    expect(screen.queryByText('Success rate')).not.toBeInTheDocument();
  });

  it('shows a disabled agent and enables it', async () => {
    setUp(agent({ connected: false, runningJobs: 0, disabledAt: '2026-10-02T00:00:00.000Z' }));
    const user = userEvent.setup();

    expect(await screen.findByText(/Disabled since/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => expect(apps.enableApp).toHaveBeenCalledWith('01JBX7AAAAAAAAAAAAAAAAK2M'));
  });

  it('disables an agent after a confirmation', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Disable' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(apps.disableApp).toHaveBeenCalledTimes(1));
  });

  it('gives the agent some projects in place of the workspace', async () => {
    setUp();
    const user = userEvent.setup();

    await screen.findByText('All projects of acme');
    await user.click(screen.getByRole('button', { name: 'Change' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.click(within(dialog).getByRole('radio', { name: 'Some projects' }));
    await user.click(await within(dialog).findByRole('checkbox', { name: 'web' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(apps.changeRunner).toHaveBeenCalledWith('ws-1', '01JBX7AAAAAAAAAAAAAAAAK2M', [
        { kind: 'grant', projectId: 'p-web' },
        { kind: 'revoke', projectId: null },
      ]),
    );
  });

  it('renames a key', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Actions of the key build-linux-01.acme.lan' }),
    );
    await user.click(await findFloating('menuitem', 'Rename'));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    const input = within(dialog).getByLabelText('Name');
    await user.clear(input);
    await user.type(input, 'gpu-box');
    await user.click(within(dialog).getByRole('button', { name: 'Rename' }));

    await waitFor(() =>
      expect(apps.renameKey).toHaveBeenCalledWith(
        '01JBX7AAAAAAAAAAAAAAAAK2M',
        'k-active-01JBX9QF7T',
        'gpu-box',
      ),
    );
  });

  it('deletes the agent only after its name is typed', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete agent' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText('Type build-linux-01 to confirm'),
      'build-linux-01',
    );
    await user.click(confirm);

    await waitFor(() => expect(apps.deleteApp).toHaveBeenCalledWith('01JBX7AAAAAAAAAAAAAAAAK2M'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/agents', undefined));
  });

  it('hides the actions that the user may not use', async () => {
    setUp(agent(), [Permission.READ_APP]);

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete agent' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New join code' })).not.toBeInTheDocument();
    expect(screen.queryByText('Access')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent jobs')).not.toBeInTheDocument();
  });

  it('says so when each key is revoked', async () => {
    setUp(agent({ connected: false, runningJobs: 0 }), ALL, [
      key('k-old', 'build-old-01', '2026-11-04T00:00:00.000Z'),
    ]);

    expect(await screen.findByText('No active key')).toBeInTheDocument();
  });

  it('offers to give access to an agent with none', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, false);

    expect(await screen.findByText('No access: this agent takes no job.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give access' })).toBeInTheDocument();
  });
});
