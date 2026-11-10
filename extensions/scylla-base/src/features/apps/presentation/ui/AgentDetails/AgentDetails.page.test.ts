import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { toast } from 'svelte-sonner';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { fakePollTimers } from '@test/queries.ts';
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
  createdBy: 'u-admin',
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
  Permission.READ_APP_STATS,
  Permission.READ_APP,
  Permission.CREATE_APP,
  Permission.DELETE_APP,
  Permission.CREATE_JOIN_CODE,
  Permission.RENAME_APP_KEY,
  Permission.REVOKE_APP_KEY,
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

const setUp = (
  details = agent(),
  permissions = ALL,
  keys = DEFAULT_KEYS,
  granted = true,
  search = '',
) => {
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
    getServerInfo: vi
      .fn()
      .mockResolvedValue({ version: '0.7.0', agentImage: 'ghcr.io/scylla-ops/scylla-agent:0.7.0' }),
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
  const navigator = installTestNavigator({ pathname: '/acme/agents/a1', search });
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
  return render(AgentDetails, { appId: details.id });
};

/** Today is 4 Nov 2026 for the stats: only `Date` is fake, the timers are real. */
const onNovember4 = () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
};

const periodsAsked = () => apps.getAgentStats.mock.calls.map(([, period]) => period);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.removeItem('userId');
  permissionsStore.setState({ permissions: null });
  vi.useRealTimers();
});

describe('AgentDetails', () => {
  it('shows the state, the stats, the machine, the jobs, the access and the keys', async () => {
    onNovember4();
    setUp();

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(screen.getByText('Running 2 jobs')).toBeInTheDocument();
    expect(await screen.findByText('412')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('396 of 412 completed')).toBeInTheDocument();
    expect(screen.getByText('3m 12s')).toBeInTheDocument();
    expect(screen.getByText('8m 40s')).toBeInTheDocument();
    expect(screen.getByText('Jobs, Oct 12 – Today')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '412 jobs, Oct 12 – Today' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '412 jobs since the agent joined, by day' }),
    ).toBeInTheDocument();
    expect(screen.getByText('build-linux-01.acme.lan', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('16 GB')).toBeInTheDocument();
    expect(await screen.findByText('All projects of acme')).toBeInTheDocument();
    expect(await screen.findByText('api')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Revoked on/)).toBeInTheDocument();
  });

  it('changes the period with a preset, and the stats follow', async () => {
    onNovember4();
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('radio', { name: '7D' }));

    expect(navigate).toHaveBeenCalledWith('/acme/agents/a1?period=7d', { replace: true });
    expect(await screen.findByText('Jobs, Oct 29 – Today')).toBeInTheDocument();
    expect(periodsAsked()).toContainEqual({ from: '2026-10-29', to: '2026-11-04' });
  });

  it('moves an edge of the window with the arrows: a day, or a week with Shift', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, '?from=2026-10-20&to=2026-10-30');
    const user = userEvent.setup();

    const start = await screen.findByRole('slider', { name: 'Start of the period, Oct 20' });
    start.focus();
    await user.keyboard('{ArrowRight}');

    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?from=2026-10-21&to=2026-10-30', {
      replace: true,
    });

    const end = screen.getByRole('slider', { name: 'End of the period, Oct 30' });
    end.focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');

    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?from=2026-10-21&to=2026-11-04', {
      replace: true,
    });
    expect(screen.getByText('Jobs, Oct 21 – Today')).toBeInTheDocument();
  });

  it('keeps the period of a link, and gives its number of days', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, '?from=2026-10-20&to=2026-10-30');

    expect(await screen.findByText('Jobs, Oct 20 – Oct 30')).toBeInTheDocument();
    expect(screen.getByText('11 days')).toBeInTheDocument();
    expect(periodsAsked()).toContainEqual({ from: '2026-10-20', to: '2026-10-30' });
  });

  it('shows the timeline of an agent that joined today, with a window of one day', async () => {
    onNovember4();
    setUp(agent({ createdAt: '2026-11-04T08:00:00.000Z' }));
    const user = userEvent.setup();

    expect(
      await screen.findByRole('img', { name: '412 jobs since the agent joined, by day' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '412 jobs, Today' })).toBeInTheDocument();
    expect(screen.getByText('Jobs, Today')).toBeInTheDocument();
    expect(periodsAsked()).toEqual([{ from: '2026-11-04', to: '2026-11-04' }]);

    const start = screen.getByRole('slider', { name: 'Start of the period, Nov 4' });
    const end = screen.getByRole('slider', { name: 'End of the period, Nov 4' });
    expect(start).toHaveAttribute('aria-valuemax', '0');
    start.focus();
    await user.keyboard('{ArrowLeft}{Shift>}{ArrowRight}{/Shift}');
    end.focus();
    await user.keyboard('{ArrowRight}{ArrowLeft}');

    expect(navigate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('radio', { name: '7D' }));

    expect(navigate).toHaveBeenCalledWith('/acme/agents/a1?period=7d', { replace: true });
    expect(screen.getByRole('radio', { name: '7D' })).toBeChecked();
    expect(screen.getByText('Jobs, Today')).toBeInTheDocument();
  });

  it('shows the last 30 days of a new agent with no job, and hatches the days before it joined', async () => {
    onNovember4();
    setUp(agent({ createdAt: '2026-11-02T08:00:00.000Z' }));
    apps.getAgentStats.mockResolvedValue({
      agentId: agent().id,
      outcomes: outcomes(0, 0),
      medianMs: null,
      p95Ms: null,
      days: [],
    });

    expect(await screen.findByRole('img', { name: '0 jobs, Oct 6 – Today' })).toBeInTheDocument();
    expect(screen.getByText('Not joined yet')).toBeInTheDocument();
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    expect(periodsAsked()).toContainEqual({ from: '2026-10-06', to: '2026-11-04' });
  });

  it('tells where the jobs of a disabled agent are when its period has none', async () => {
    onNovember4();
    const disabled = agent({ disabledAt: '2026-10-25T10:00:00.000Z', connected: false });
    setUp(disabled, ALL, DEFAULT_KEYS, true, '?period=7d');
    apps.getAgentStats = vi.fn((_id: string, period: { from: string }) =>
      Promise.resolve({
        agentId: disabled.id,
        outcomes: period.from === '2026-10-12' ? outcomes(20, 2) : outcomes(0, 0),
        medianMs: null,
        p95Ms: null,
        days: [],
      }),
    );

    expect(
      await screen.findByText(
        'No job in this period. Drag the timeline window before Oct 25 to see the jobs.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Oct 29 – Today · disabled since Oct 25')).toBeInTheDocument();
    expect(screen.getByText('No ended job')).toBeInTheDocument();
    expect(screen.getAllByText('Disabled since Oct 25')).toHaveLength(2);
  });

  it('ends with a space under the last card, above a floating button at the bottom right', async () => {
    const { container } = setUp();

    await screen.findByRole('heading', { name: 'build-linux-01' });

    expect(container.firstElementChild).toHaveClass('pb-20');
  });

  it('gives a command to connect an agent that never said hello', async () => {
    setUp(agent({ connected: false, lastSeenAt: '', host: null, runningJobs: 0 }));

    const user = userEvent.setup();

    expect(await screen.findByText('Connect this agent')).toBeInTheDocument();
    expect(apps.createJoinCode).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Make a join code' }));

    await waitFor(() => expect(apps.createJoinCode).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/JOIN-99/)).toBeInTheDocument();
    expect(screen.queryByText('Success rate')).not.toBeInTheDocument();
  });

  it('shows that a machine joined and did not connect yet', async () => {
    fakePollTimers();
    setUp(agent({ connected: false, lastSeenAt: '', host: null, runningJobs: 0 }), ALL, []);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Make a join code' }));
    expect(await screen.findByText('Waiting for the agent…')).toBeInTheDocument();

    apps.getApp.mockResolvedValue({
      app: agent({ connected: false, lastSeenAt: '', host: null, runningJobs: 0 }),
      keys: [key('k-new', 'host-1')],
    });
    await vi.advanceTimersByTimeAsync(2_000);

    expect(
      await screen.findByText('The machine joined. Waiting for its connection.'),
    ).toBeInTheDocument();
  });

  it('gives the command for the system of an agent with another version', async () => {
    setUp(agent({ host: { ...host, version: '0.6.0' } }));

    expect(
      await screen.findByText('This agent has version 0.6.0. The server has version 0.7.0.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/install\.sh \| sh -s -- --update/)).toBeInTheDocument();
    expect(screen.getByText(/scylla-agent:0\.7\.0$/)).toBeInTheDocument();
  });

  it('gives no update command to an agent with the version of the server', async () => {
    setUp();

    expect(await screen.findByText('Machine')).toBeInTheDocument();
    await waitFor(() => expect(apps.getServerInfo).toHaveBeenCalled());
    expect(screen.queryByText(/sh -s -- --update/)).not.toBeInTheDocument();
  });

  it('gives the uninstall commands of a Windows agent, with no Docker command', async () => {
    setUp(agent({ host: { ...host, os: 'windows' } }));

    expect(await screen.findByText(/install\.ps1\)\)\) -Uninstall/)).toBeInTheDocument();
    expect(screen.queryByText(/docker volume rm/)).not.toBeInTheDocument();
  });

  it('gives the Docker uninstall command also on Linux, because a container reports Linux', async () => {
    setUp();

    expect(await screen.findByText(/sh -s -- --uninstall/)).toBeInTheDocument();
    expect(screen.getByText(/docker volume rm scylla-agent/)).toBeInTheDocument();
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
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Agent deleted'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/agents', undefined));
  });

  it('asks nothing more about the agent after its delete: the server would refuse', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete agent' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.type(
      within(dialog).getByLabelText('Type build-linux-01 to confirm'),
      'build-linux-01',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/agents', undefined));

    expect(apps.getApp).toHaveBeenCalledTimes(1);
    expect(apps.getAgentStats).toHaveBeenCalledTimes(1);
    expect(apps.listJobs).toHaveBeenCalledTimes(1);
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

  it('gives the keys and a new join code only to who may manage the apps, as the server does', async () => {
    setUp(agent(), [Permission.READ_APP, Permission.CREATE_APP]);

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New join code' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions of the key build-linux-01.acme.lan' }),
    ).not.toBeInTheDocument();
  });

  it('gives the keys and a new join code to the creator of the agent with no other right', async () => {
    localStorage.setItem('userId', 'u-maker');
    setUp(agent({ createdBy: 'u-maker' }), [Permission.READ_APP]);
    const user = userEvent.setup();

    expect(await screen.findByRole('button', { name: 'New join code' })).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Actions of the key build-linux-01.acme.lan' }),
    );
    expect(await findFloating('menuitem', 'Rename')).toBeInTheDocument();
    expect(await findFloating('menuitem', 'Revoke')).toBeInTheDocument();
  });

  it('shows the agent with no stats to a reader of the apps who may not read the stats', async () => {
    setUp(agent(), [Permission.READ_APP]);

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(screen.queryByText('Jobs per day')).not.toBeInTheDocument();
    expect(screen.queryByText('Success rate')).not.toBeInTheDocument();
    expect(apps.getAgentStats).not.toHaveBeenCalled();
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
