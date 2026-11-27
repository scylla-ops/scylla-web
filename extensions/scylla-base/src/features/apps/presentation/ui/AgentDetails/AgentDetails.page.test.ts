import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { toast } from 'svelte-sonner';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import {
  findFloating,
  findTooltip,
  focusSettled,
  render,
  withQueryClient,
  withRegistry,
} from '@test/render.ts';
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
  protocol: 2,
  build: '0123abcdef',
  features: ['checkout'],
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
  compatibility: 'compatible',
  missingFeatures: [],
  labels: [],
  automaticLabels: [],
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
  serverVersion = '0.7.0',
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
      .mockResolvedValue({
        version: serverVersion,
        agentImage: 'ghcr.io/scylla-ops/scylla-agent:0.7.0',
        agentProtocol: { min: 0, current: 2 },
      }),
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
    listJobPage: vi.fn().mockResolvedValue({
      jobs: [
        {
          id: 'job-000001',
          pipelineId: 'pl-1',
          projectId: 'p-api',
          status: 'running',
          createdAt: '2026-11-04T14:00:00.000Z',
        },
      ],
      more: false,
    }),
    createJoinCode: vi.fn().mockResolvedValue({
      code: 'JOIN-99',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    }),
    enableApp: vi.fn().mockResolvedValue({ ...details, disabledAt: '' }),
    disableApp: vi.fn().mockResolvedValue({ ...details, disabledAt: '2026-11-04T00:00:00.000Z' }),
    changeRunner: vi.fn().mockResolvedValue(undefined),
    setLabels: vi.fn().mockResolvedValue(details),
    setIcon: vi.fn().mockResolvedValue(details),
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

/** The value of a row of the machine card. */
const machineValue = (label: string) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement;

const periodsAsked = () => apps.getAgentStats.mock.calls.map(([, period]) => period);

/** The search of a page that opens on a tab. */
const MACHINE = '?tab=machine';
const SETTINGS = '?tab=settings';
const ACTIVITY = '?tab=activity';

/** Opens the "…" menu of the header. */
const openMenu = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: 'Actions of build-linux-01' }));

const tabNames = () => screen.getAllByRole('tab').map(tab => tab.textContent?.trim());

/** The items of the open menu, which is in a floating layer. */
const menuItems = () =>
  screen.getAllByRole('menuitem', { hidden: true }).map(item => item.textContent?.trim());

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.removeItem('userId');
  permissionsStore.setState({ permissions: null });
  vi.useRealTimers();
});

describe('AgentDetails', () => {
  it('opens on the overview: the state now, the figures, the jobs, the machine and the access', async () => {
    onNovember4();
    setUp();

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(tabNames()).toEqual(['Overview', 'Jobs', 'Activity', 'Settings', 'Machine']);
    expect(screen.getByText('Running 2 jobs')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 slots busy')).toBeInTheDocument();
    expect(await screen.findByText('412')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('396 of 412 completed')).toBeInTheDocument();
    expect(screen.getByText('3m 12s')).toBeInTheDocument();
    expect(screen.getByText('8m 40s')).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: '23 jobs in the last 14 days, by day' }),
    ).toBeInTheDocument();
    expect(screen.getByText('build-linux-01.acme.lan', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('16 GB')).toBeInTheDocument();
    expect(await screen.findByText('All projects of acme')).toBeInTheDocument();
    expect((await screen.findAllByText('api')).length).toBeGreaterThan(0);
    expect(apps.listJobPage).toHaveBeenCalledWith('ws-1', '01JBX7AAAAAAAAAAAAAAAAK2M', {
      limit: 5,
    });
  });

  it('keeps the open tab in the URL, and opens the jobs from the overview', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('tab', { name: 'Jobs' }));
    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?tab=jobs', { replace: true });
    expect(screen.getByRole('tab', { name: 'Jobs' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1', { replace: true });

    await user.click(await screen.findByRole('button', { name: 'All jobs' }));
    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?tab=jobs', { replace: true });
  });

  it('opens the overview for a tab that the user may not see', async () => {
    setUp(agent(), [Permission.READ_APP], DEFAULT_KEYS, true, ACTIVITY);

    expect(await screen.findByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabNames()).toEqual(['Overview', 'Settings', 'Machine']);
  });

  it('shows the activity in one card: the timeline, the figures and the jobs per day', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, ACTIVITY);

    expect(await screen.findByText('Jobs, Oct 12 – Today')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '412 jobs, Oct 12 – Today' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '412 jobs since the agent joined, by day' }),
    ).toBeInTheDocument();
    expect(screen.getByText('396 of 412 completed')).toBeInTheDocument();
  });

  it('changes the period with a preset, and the stats follow', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, ACTIVITY);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('radio', { name: '7 d' }));

    expect(navigate).toHaveBeenCalledWith('/acme/agents/a1?tab=activity&period=7d', {
      replace: true,
    });
    expect(await screen.findByText('Jobs, Oct 29 – Today')).toBeInTheDocument();
    expect(periodsAsked()).toContainEqual({ from: '2026-10-29', to: '2026-11-04' });
  });

  it('moves an edge of the window with the arrows: a day, or a week with Shift', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, '?tab=activity&from=2026-10-20&to=2026-10-30');
    const user = userEvent.setup();

    const start = await screen.findByRole('slider', { name: 'Start of the period, Oct 20' });
    start.focus();
    await user.keyboard('{ArrowRight}');

    expect(navigate).toHaveBeenLastCalledWith(
      '/acme/agents/a1?tab=activity&from=2026-10-21&to=2026-10-30',
      { replace: true },
    );

    const end = screen.getByRole('slider', { name: 'End of the period, Oct 30' });
    end.focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');

    expect(navigate).toHaveBeenLastCalledWith(
      '/acme/agents/a1?tab=activity&from=2026-10-21&to=2026-11-04',
      { replace: true },
    );
    expect(screen.getByText('Jobs, Oct 21 – Today')).toBeInTheDocument();
  });

  it('keeps the period of a link, and gives its number of days', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, '?tab=activity&from=2026-10-20&to=2026-10-30');

    expect(await screen.findByText('Jobs, Oct 20 – Oct 30')).toBeInTheDocument();
    expect(screen.getByText('11 days')).toBeInTheDocument();
    expect(periodsAsked()).toContainEqual({ from: '2026-10-20', to: '2026-10-30' });
  });

  it('gives one line for an agent that joined today, and opens its jobs', async () => {
    onNovember4();
    setUp(agent({ createdAt: '2026-11-04T08:00:00.000Z' }), ALL, DEFAULT_KEYS, true, ACTIVITY);
    const user = userEvent.setup();

    expect(await screen.findByText('412 jobs since the agent joined today.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '7 d' })).not.toBeInTheDocument();
    expect(periodsAsked()).toEqual([{ from: '2026-11-04', to: '2026-11-04' }]);

    await user.click(screen.getByRole('button', { name: 'See the 412 jobs' }));

    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?tab=jobs', { replace: true });
  });

  it('gives the chart of each day with no timeline to an agent that joined a few days ago', async () => {
    onNovember4();
    setUp(agent({ createdAt: '2026-11-02T08:00:00.000Z' }), ALL, DEFAULT_KEYS, true, ACTIVITY);

    expect(
      await screen.findByText('The agent joined on Nov 2. The chart shows each day since.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: '412 jobs, Nov 2 – Today' })).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '7 d' })).not.toBeInTheDocument();
  });

  it('shows a short block with the next step for an agent with no ended job', async () => {
    onNovember4();
    setUp(agent({ createdAt: '2026-11-02T08:00:00.000Z' }), ALL, DEFAULT_KEYS, true, ACTIVITY);
    apps.getAgentStats.mockResolvedValue({
      agentId: agent().id,
      outcomes: outcomes(0, 0),
      medianMs: null,
      p95Ms: null,
      days: [],
    });
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'No ended job yet' })).toBeInTheDocument();
    expect(screen.queryByText('Jobs per day')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open the projects' }));

    expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined);
  });

  it('tells where the jobs of a disabled agent are when its period has none', async () => {
    onNovember4();
    const disabled = agent({ disabledAt: '2026-10-25T10:00:00.000Z', connected: false });
    setUp(disabled, ALL, DEFAULT_KEYS, true, '?tab=activity&period=7d');
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
    expect(screen.getAllByText('Disabled since Oct 25').length).toBeGreaterThan(0);
  });

  it('ends with a space under the last card, above a floating button at the bottom right', async () => {
    const { container } = setUp();

    await screen.findByRole('heading', { name: 'build-linux-01' });

    expect(container.firstElementChild).toHaveClass('pb-20');
  });

  it('opens the install step to connect an agent that never said hello, with no code on open', async () => {
    setUp(agent({ connected: false, lastSeenAt: '', host: null, runningJobs: 0 }));
    apps.listJobPage.mockResolvedValue({ jobs: [], more: false });
    const user = userEvent.setup();

    expect(await screen.findByText('Connect this agent')).toBeInTheDocument();
    const finish = await screen.findAllByRole('button', { name: 'Finish setup' });
    await user.click(finish[0]);

    expect(navigate).toHaveBeenCalledWith(
      '/acme/agents/01JBX7AAAAAAAAAAAAAAAAK2M/connect',
      undefined,
    );
    expect(apps.createJoinCode).not.toHaveBeenCalled();
    expect(screen.queryByText('Success rate')).not.toBeInTheDocument();
  });

  it('opens the install step for a new join code from the menu of the header', async () => {
    setUp();
    const user = userEvent.setup();

    await openMenu(user);
    await user.click(await findFloating('menuitem', 'New join code'));

    expect(navigate).toHaveBeenCalledWith(
      '/acme/agents/01JBX7AAAAAAAAAAAAAAAAK2M/connect',
      undefined,
    );
  });

  it('gives in the menu of the header the actions of the agent, the destructive ones last', async () => {
    setUp();
    const user = userEvent.setup();

    await openMenu(user);
    await findFloating('menuitem', 'Copy the ID');

    expect(menuItems()).toEqual(['New join code', 'Copy the ID', 'Disable…', 'Delete the agent…']);
  });

  it('gives the command for the system of an agent with another version', async () => {
    setUp(agent({ host: { ...host, version: '0.6.0' } }), ALL, DEFAULT_KEYS, true, MACHINE);

    expect(
      await screen.findByText('This agent has version 0.6.0. The server has version 0.7.0.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/install\.sh \| sh -s -- --update/)).toBeInTheDocument();
    expect(screen.getByText(/scylla-agent:0\.7\.0$/)).toBeInTheDocument();
  });

  it('shows an outdated agent with the version of the server in badges, and its update command', async () => {
    setUp(
      agent({ host: { ...host, protocol: 0, build: '' }, compatibility: 'outdated' }),
      ALL,
      DEFAULT_KEYS,
      true,
      MACHINE,
    );

    await screen.findByText('Agent version');
    await userEvent.hover(within(machineValue('Agent version')).getByText('0.7.0'));

    expect(await findTooltip()).toHaveTextContent(
      'This agent is older than the server. It runs only the jobs that it can run.',
    );
    await waitFor(() => expect(machineValue('Server version')).toHaveTextContent('0.7.0'));
    expect(screen.getByText(/install\.sh \| sh -s -- --update/)).toBeInTheDocument();
    expect(screen.queryByText(/protocol/)).not.toBeInTheDocument();
    expect(screen.queryByText(/This agent has version/)).not.toBeInTheDocument();
  });

  it('tells in the badge of its version that the server refuses the agent', async () => {
    setUp(
      agent({ host: { ...host, protocol: 0 }, compatibility: 'unsupported' }),
      ALL,
      DEFAULT_KEYS,
      true,
      MACHINE,
    );

    await screen.findByText('Agent version');
    await userEvent.hover(within(machineValue('Agent version')).getByText('0.7.0'));

    expect(await findTooltip()).toHaveTextContent(
      'This agent is too old for the server. The server refuses it until you update it.',
    );
  });

  it('asks for a new agent for a feature that its protocol does not have', async () => {
    setUp(
      agent({
        host: { ...host, protocol: 0, features: [] },
        compatibility: 'outdated',
        missingFeatures: ['checkout'],
      }),
      ALL,
      DEFAULT_KEYS,
      true,
      MACHINE,
    );

    await userEvent.hover(await screen.findByText('checkout'));

    expect(await findTooltip()).toHaveTextContent('Update the agent');
  });

  it('asks for git on an agent with the protocol and no checkout', async () => {
    setUp(
      agent({ host: { ...host, features: [] }, missingFeatures: ['checkout'] }),
      ALL,
      DEFAULT_KEYS,
      true,
      MACHINE,
    );

    await userEvent.hover(await screen.findByText('checkout'));

    expect(await findTooltip()).toHaveTextContent('Install Git on this machine');
    expect(screen.queryByText(/sh -s -- --update/)).not.toBeInTheDocument();
  });

  it('asks no update of an agent of the release of a server build with its commit', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, MACHINE, '0.7.0+240da00');

    await waitFor(() => expect(machineValue('Server version')).toHaveTextContent('0.7.0+240da00'));
    expect(machineValue('Agent version')).toHaveTextContent('0.7.0');
    expect(screen.queryByText(/sh -s -- --update/)).not.toBeInTheDocument();
  });

  it('shows None for an agent with no container runtime and no feature', async () => {
    setUp(
      agent({ host: { ...host, containerRuntime: '', features: [] } }),
      ALL,
      DEFAULT_KEYS,
      true,
      MACHINE,
    );

    expect(await screen.findByText('Container runtime')).toBeInTheDocument();
    expect(machineValue('Container runtime')).toHaveTextContent('None');
    expect(machineValue('Features')).toHaveTextContent('None');
  });

  it('gives no update command to an agent with the version of the server', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, MACHINE);

    expect(await screen.findByText('Container runtime')).toBeInTheDocument();
    await waitFor(() => expect(apps.getServerInfo).toHaveBeenCalled());
    expect(screen.queryByText(/sh -s -- --update/)).not.toBeInTheDocument();
  });

  it('gives the uninstall commands of a Windows agent, with no Docker command', async () => {
    setUp(agent({ host: { ...host, os: 'windows' } }), ALL, DEFAULT_KEYS, true, MACHINE);

    expect(await screen.findByText(/install\.ps1\)\)\) -Uninstall/)).toBeInTheDocument();
    expect(screen.queryByText(/docker volume rm/)).not.toBeInTheDocument();
  });

  it('gives the Docker uninstall command also on Linux, because a container reports Linux', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, MACHINE);

    expect(await screen.findByText(/sh -s -- --uninstall/)).toBeInTheDocument();
    expect(screen.getByText(/docker volume rm scylla-agent/)).toBeInTheDocument();
  });

  it('shows a disabled agent and enables it from the banner', async () => {
    setUp(agent({ connected: false, runningJobs: 0, disabledAt: '2026-10-02T00:00:00.000Z' }));
    const user = userEvent.setup();

    expect(await screen.findByText(/Disabled since/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enable' }));

    await waitFor(() => expect(apps.enableApp).toHaveBeenCalledWith('01JBX7AAAAAAAAAAAAAAAAK2M'));
  });

  it('disables an agent from the menu of the header, after a confirmation', async () => {
    setUp();
    const user = userEvent.setup();

    await openMenu(user);
    await user.click(await findFloating('menuitem', 'Disable…'));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(apps.disableApp).toHaveBeenCalledTimes(1));
  });

  it('disables an agent from its settings too', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, SETTINGS);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Disable…' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Disable' }));

    await waitFor(() => expect(apps.disableApp).toHaveBeenCalledTimes(1));
  });

  it('gives the agent some projects in place of the workspace', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, SETTINGS);
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

  it('shows the labels of an admin apart from the labels of the machine, and changes them', async () => {
    setUp(
      agent({ labels: ['deploy'], automaticLabels: ['linux', 'x64'] }),
      [...ALL, Permission.SET_APP_LABELS],
      DEFAULT_KEYS,
      true,
      SETTINGS,
    );
    const user = userEvent.setup();

    const admin = await screen.findByRole('list', { name: 'From an admin' });
    const machine = screen.getByRole('list', { name: 'From the machine' });
    expect(within(admin).getAllByRole('listitem').map(item => item.textContent?.trim())).toEqual([
      'deploy',
    ]);
    expect(within(machine).getAllByRole('listitem').map(item => item.textContent?.trim())).toEqual(
      ['linux', 'x64'],
    );
    await user.click(screen.getByRole('button', { name: 'Change the labels' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    const field = within(dialog).getByRole('textbox', { name: 'New label' });
    expect(field).toHaveFocus();
    await user.type(field, 'Prod Host{Enter}');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Use 1 to 32 lower case letters');
    expect(field).toHaveAccessibleDescription(/Use 1 to 32 lower case letters/);
    await user.clear(field);
    await user.type(field, 'gpu{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Remove deploy' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(apps.setLabels).toHaveBeenCalledWith('01JBX7AAAAAAAAAAAAAAAAK2M', ['gpu']),
    );
  });

  it('gives the change of the labels only to an admin of the workspace', async () => {
    setUp(agent({ labels: ['deploy'] }), ALL, DEFAULT_KEYS, true, SETTINGS);

    expect(await screen.findByRole('list', { name: 'From an admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change the labels' })).not.toBeInTheDocument();
    expect(screen.getByText('After the first connection')).toBeInTheDocument();
  });

  it('gives the icon of an agent to an admin of the workspace, who resets it or picks one', async () => {
    setUp(
      agent({ icon: { kind: 'glyph', name: 'server', color: 'chart-3' } }),
      [...ALL, Permission.SET_APP_ICON],
      DEFAULT_KEYS,
      true,
      SETTINGS,
    );
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Agent icon' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() =>
      expect(apps.setIcon).toHaveBeenCalledWith('01JBX7AAAAAAAAAAAAAAAAK2M', { kind: 'default' }),
    );
    const card = screen.getByRole('heading', { name: 'Agent icon' }).closest<HTMLElement>(
      '[data-slot="card"]',
    )!;
    await user.click(within(card).getByRole('button', { name: 'Change the icon…' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(apps.setIcon).toHaveBeenLastCalledWith('01JBX7AAAAAAAAAAAAAAAAK2M', {
        kind: 'glyph',
        name: 'server',
        color: 'chart-3',
      }),
    );
  });

  it('opens the icon from the avatar of the header, for an admin of the workspace', async () => {
    setUp(agent(), [...ALL, Permission.SET_APP_ICON]);
    const user = userEvent.setup();

    const header = (await screen.findByRole('heading', { level: 1 })).closest('header')!;
    const avatar = within(header).getByRole('button', { name: 'Change the icon…' });
    expect(avatar).toHaveClass('cursor-pointer');
    avatar.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: 'Agent icon' })).toBeInTheDocument();
  });

  it('opens the icon from the menu of the header too', async () => {
    setUp(agent(), [...ALL, Permission.SET_APP_ICON]);
    const user = userEvent.setup();

    await openMenu(user);
    await user.click(await findFloating('menuitem', 'Change the icon…'));

    expect(await screen.findByRole('dialog', { name: 'Agent icon' })).toBeInTheDocument();
  });

  it('gives the change of the icon only to an admin of the workspace', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, SETTINGS);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Labels' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Agent icon' })).not.toBeInTheDocument();
    const header = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(header).queryByRole('button', { name: 'Change the icon…' })).toBeNull();
    await openMenu(user);
    await findFloating('menuitem', 'Copy the ID');
    expect(menuItems()).not.toContain('Change the icon…');
  });

  it('shows the number of jobs at once that the machine gives, with the option that changes it', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, SETTINGS);

    const title = await screen.findByRole('heading', { name: 'Jobs at once' });
    const card = title.closest<HTMLElement>('[data-slot="card"]')!;
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('--capacity <n>')).toBeInTheDocument();
  });

  it('renames a key', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, MACHINE);
    const user = userEvent.setup();

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Revoked on/)).toBeInTheDocument();
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

  it('deletes the agent from the menu of the header, only after its name is typed', async () => {
    setUp();
    const user = userEvent.setup();

    await openMenu(user);
    await user.click(await findFloating('menuitem', 'Delete the agent…'));
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

  it('asks nothing more about the agent after its delete from the settings: the server would refuse', async () => {
    onNovember4();
    setUp(agent(), ALL, DEFAULT_KEYS, true, SETTINGS);
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
  });

  it('hides the actions and the tabs that the user may not use', async () => {
    setUp(agent(), [Permission.READ_APP]);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'build-linux-01' })).toBeInTheDocument();
    expect(tabNames()).toEqual(['Overview', 'Settings', 'Machine']);
    expect(screen.queryByText('Access and labels')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent jobs')).not.toBeInTheDocument();
    await openMenu(user);
    await findFloating('menuitem', 'Copy the ID');
    expect(menuItems()).toEqual([
      'Copy the ID',
    ]);
    expect(apps.listJobPage).not.toHaveBeenCalled();
  });

  it('gives the keys and a new join code only to who may manage the apps, as the server does', async () => {
    setUp(agent(), [Permission.READ_APP, Permission.CREATE_APP], DEFAULT_KEYS, true, MACHINE);

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New join code' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions of the key build-linux-01.acme.lan' }),
    ).not.toBeInTheDocument();
  });

  it('gives the keys and a new join code to the creator of the agent with no other right', async () => {
    localStorage.setItem('userId', 'u-maker');
    setUp(agent({ createdBy: 'u-maker' }), [Permission.READ_APP], DEFAULT_KEYS, true, MACHINE);
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
    expect(screen.queryByRole('tab', { name: 'Activity' })).not.toBeInTheDocument();
    expect(screen.queryByText('Success rate')).not.toBeInTheDocument();
    expect(apps.getAgentStats).not.toHaveBeenCalled();
  });

  it('says so when each key is revoked', async () => {
    setUp(agent({ connected: false, runningJobs: 0 }), ALL, [
      key('k-old', 'build-old-01', '2026-11-04T00:00:00.000Z'),
    ]);

    expect(await screen.findByText('No active key')).toBeInTheDocument();
  });

  it('offers to give access to an agent with none, on the overview and in the settings', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, false);
    const user = userEvent.setup();

    expect(await screen.findByText('No access: this agent takes no job.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Manage' }));

    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?tab=settings', { replace: true });
    expect(await screen.findByRole('button', { name: 'Give access' })).toBeInTheDocument();
  });

  it('gives an agent with no job the next step in its list of jobs', async () => {
    setUp(agent({ runningJobs: 0 }), ALL, DEFAULT_KEYS, false, '?tab=jobs');
    apps.listJobPage.mockResolvedValue({ jobs: [], more: false });
    const user = userEvent.setup();

    expect(await screen.findByText('No job yet.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Give access' }));

    expect(navigate).toHaveBeenLastCalledWith('/acme/agents/a1?tab=settings', { replace: true });
  });
});

describe('the jobs of an agent', () => {
  const job = (index: number) => ({
    id: `job-${String(index).padStart(6, '0')}`,
    pipelineId: 'pl-1',
    projectId: 'p-api',
    status: 'completed',
    createdAt: '2026-11-04T14:00:00.000Z',
    startedAt: '2026-11-04T14:00:00.000Z',
    finishedAt: '2026-11-04T14:03:12.000Z',
  });
  const jobPage = (count: number, more: boolean) => ({
    jobs: Array.from({ length: count }, (_, index) => job(index)),
    more,
  });

  it('lists 10 jobs, then 10 more, with the count of each state in the filter', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, '?tab=jobs');
    apps.listJobPage.mockResolvedValue(jobPage(10, true));
    const user = userEvent.setup();

    expect(await screen.findAllByRole('link', { name: /api/ })).toHaveLength(10);
    expect(await screen.findByRole('radio', { name: /Failed/ })).toHaveTextContent('16');
    expect(screen.getByRole('radio', { name: /All/ })).toHaveTextContent('414');
    apps.listJobPage.mockResolvedValue(jobPage(20, false));
    await user.click(screen.getByRole('button', { name: 'Show 10 more' }));

    await waitFor(() => expect(screen.getAllByRole('link', { name: /api/ })).toHaveLength(20));
    expect(screen.queryByRole('button', { name: 'Show 10 more' })).not.toBeInTheDocument();
    expect(apps.listJobPage).toHaveBeenLastCalledWith('ws-1', '01JBX7AAAAAAAAAAAAAAAAK2M', {
      limit: 20,
      statuses: [],
      text: '',
    });
  });

  it('asks the server for the jobs of a state or a search, and clears them', async () => {
    setUp(agent(), ALL, DEFAULT_KEYS, true, '?tab=jobs');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('radio', { name: /Failed/ }));
    await waitFor(() =>
      expect(apps.listJobPage).toHaveBeenLastCalledWith('ws-1', '01JBX7AAAAAAAAAAAAAAAAK2M', {
        limit: 10,
        statuses: ['failed', 'orphaned'],
        text: '',
      }),
    );

    apps.listJobPage.mockResolvedValue({ jobs: [], more: false });
    await user.type(screen.getByRole('searchbox', { name: /Search/ }), 'main');
    await waitFor(() =>
      expect(apps.listJobPage).toHaveBeenLastCalledWith('ws-1', '01JBX7AAAAAAAAAAAAAAAAK2M', {
        limit: 10,
        statuses: ['failed', 'orphaned'],
        text: 'main',
      }),
    );
    expect(await screen.findByText('No job matches.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the filters' }));

    expect(screen.getByRole('radio', { name: /All/ })).toBeChecked();
    expect(screen.getByRole('searchbox', { name: /Search/ })).toHaveValue('');
  });
});
