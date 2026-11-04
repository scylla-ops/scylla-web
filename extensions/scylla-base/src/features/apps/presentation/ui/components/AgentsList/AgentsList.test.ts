import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import AgentsList from './AgentsList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const host = (hostname: string) => ({
  version: '0.1.0',
  os: 'linux',
  arch: 'x86_64',
  hostname,
  cpuCount: 8,
  totalMemoryMb: 16384,
  capacity: 2,
  containerRuntime: 'docker',
});

const agent = (id: string, name: string, patch: Record<string, unknown> = {}) => ({
  id,
  workspaceId: 'ws-1',
  name,
  runner: true,
  connected: true,
  lastSeenAt: '2026-01-01T00:00:00.000Z',
  host: host(`${name}.acme.lan`),
  createdAt: '2026-01-01T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
  ...patch,
});

const AGENTS = [
  agent('a1', 'build-linux-01', { runningJobs: 2 }),
  agent('a2', 'win-dev-01', { host: host('DESKTOP-7Q2M1') }),
  agent('a3', 'mac-mini-office', { connected: false }),
  agent('a4', 'gpu-runner-01', { connected: false, lastSeenAt: '', host: null }),
  agent('a5', 'old-runner', { connected: false, disabledAt: '2026-10-02T00:00:00.000Z' }),
];

const day = (completed: number, failed: number) => ({
  day: '2026-01-01T00:00:00.000Z',
  outcomes: { completed, failed, cancelled: 0, orphaned: 0 },
});

let teardown: Array<() => void> = [];
let apps: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (permissions: Permission[], agents: unknown[] = AGENTS) => {
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
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  apps = {
    listApps: vi.fn().mockResolvedValue(agents),
    listAgentStats: vi.fn().mockResolvedValue([
      {
        agentId: 'a1',
        outcomes: { completed: 9, failed: 1, cancelled: 0, orphaned: 0 },
        medianMs: 1000,
        p95Ms: 2000,
        days: [day(4, 1), day(5, 0)],
      },
    ]),
    disableApp: vi.fn().mockResolvedValue({ ...AGENTS[2], disabledAt: '2026-11-04T00:00:00.000Z' }),
    getApp: vi.fn().mockResolvedValue({ app: AGENTS[3], keys: [] }),
    createJoinCode: vi.fn().mockResolvedValue({
      code: 'JOIN-77',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    }),
  };
  const runner = (actorId: string) => ({
    actorId,
    actorKind: 'app',
    displayName: actorId,
    handle: '',
    role: 'runner',
  });
  const access = {
    listAccess: vi.fn(({ kind, id }: { kind: string; id: string }) =>
      Promise.resolve(
        kind === 'workspace'
          ? [runner('a1'), runner('a3'), runner('a5')]
          : id === 'p-1' || id === 'p-2'
            ? [runner('a2')]
            : [runner('a4')],
      ),
    ),
  };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [
        { id: 'p-1', name: 'web' },
        { id: 'p-2', name: 'api' },
        { id: 'p-3', name: 'ml-training' },
      ],
      pagination: { page: 1, pageSize: 100, total: 3 },
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      apps: { appsRepository: apps },
      access: { accessRepository: access },
      project: { projectRepository: projects },
    }),
  ];
  render(AgentsList);
};

const ALL = [
  Permission.LIST_APPS_BY_WORKSPACE,
  Permission.CREATE_APP,
  Permission.READ_APP,
  Permission.DELETE_APP,
  Permission.LIST_WORKSPACE_MEMBERS,
];

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AgentsList', () => {
  it('sums up the agents, and shows the state, the projects and the jobs of each one', async () => {
    setUp(ALL);

    expect(await screen.findByText('build-linux-01')).toBeInTheDocument();
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
    expect(screen.getByText('2 jobs')).toBeInTheDocument();
    expect(screen.getByText('1 offline · 1 never connected')).toBeInTheDocument();
    expect(await screen.findByText('90% passed')).toBeInTheDocument();

    const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
    expect(within(row('build-linux-01')).getByText('Running 2 jobs')).toBeInTheDocument();
    expect(
      within(row('build-linux-01')).getByRole('img', { name: '10 jobs in 30 days' }),
    ).toBeInTheDocument();
    expect(within(row('mac-mini-office')).getByText('Offline')).toBeInTheDocument();
    expect(within(row('gpu-runner-01')).getByText('Never said hello')).toBeInTheDocument();
    expect(within(row('old-runner')).getByText('Disabled')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(row('win-dev-01')).getByText('api, web')).toBeInTheDocument(),
    );
    expect(within(row('build-linux-01')).getByText('All projects')).toBeInTheDocument();
    expect(within(row('gpu-runner-01')).getByText('ml-training')).toBeInTheDocument();
  });

  it('filters the agents by state and finds them by host name', async () => {
    setUp(ALL);
    const user = userEvent.setup();
    await screen.findByText('build-linux-01');

    await user.click(screen.getByRole('radio', { name: /Offline/ }));
    expect(screen.getByText('mac-mini-office')).toBeInTheDocument();
    expect(screen.queryByText('build-linux-01')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /All/ }));
    await user.type(screen.getByRole('searchbox', { name: 'Search by name or host' }), 'desktop');
    expect(screen.getByText('win-dev-01')).toBeInTheDocument();
    expect(screen.queryByText('mac-mini-office')).not.toBeInTheDocument();
  });

  it('disables an agent after a confirmation', async () => {
    setUp(ALL);
    const user = userEvent.setup();
    await screen.findByText('mac-mini-office');

    await user.click(screen.getByRole('button', { name: 'Actions of mac-mini-office' }));
    await user.click(await findFloating('menuitem', 'Disable'));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Disable mac-mini-office?')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(apps.disableApp).toHaveBeenCalledWith('a3'));
  });

  it('shows the install command of an agent that never connected', async () => {
    setUp(ALL);
    const user = userEvent.setup();
    await screen.findByText('gpu-runner-01');

    await user.click(screen.getByRole('button', { name: 'Show the command' }));

    expect(await screen.findByText('Install gpu-runner-01')).toBeInTheDocument();
    await waitFor(() => expect(apps.createJoinCode).toHaveBeenCalledWith('a4'));
    expect(await screen.findByText(/JOIN-77/)).toBeInTheDocument();
  });

  it('hides the projects and the actions that the user may not use', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE]);
    const user = userEvent.setup();
    await screen.findByText('gpu-runner-01');

    expect(screen.queryByText('Access')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show the command' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions of gpu-runner-01' }));
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(items.map(item => item.textContent?.trim())).toEqual(['Open agent', 'Copy ID']);
  });

  it('asks an admin to add the first agent to open the wizard', async () => {
    setUp(ALL, []);
    const user = userEvent.setup();

    expect(await screen.findByText('Run your first agent')).toBeInTheDocument();
    const adds = screen.getAllByRole('button', { name: /Add an agent/ });
    await user.click(adds[adds.length - 1]);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('tells a member with no right to add one to ask an admin', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE], []);

    expect(await screen.findByText('No agent yet')).toBeInTheDocument();
    expect(
      screen.getByText('Agents run your pipeline jobs. Ask an admin to add one.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Run your first agent')).not.toBeInTheDocument();
  });
});
