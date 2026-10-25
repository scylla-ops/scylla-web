import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { AppAccess } from '@base/features/apps';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import type { AgentStats } from '@base/features/agents/domain/structs/agent.struct.ts';
import AgentsPage from './Agents.page.svelte';

const NOW = '2026-10-11T08:00:00.000Z';

const agent = (overrides: Partial<AgentEntity> = {}): AgentEntity => ({
  id: 'agent-1',
  organizationId: 'org-1',
  name: 'runner-1',
  isActive: true,
  connected: true,
  lastSeen: NOW,
  inFlight: 0,
  host: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const host = (hostname: string) => ({
  version: '0.5.0',
  os: 'linux',
  arch: 'amd64',
  hostname,
  cpuCount: 4,
  totalMemoryMb: 8192,
  reportedAt: NOW,
});

const AGENTS = [
  agent({ id: 'a-idle', name: 'prelude-deployer', host: host('grok-vps') }),
  agent({ id: 'a-run', name: 'vitrine-deployer', inFlight: 2, host: host('grok-vps') }),
  agent({ id: 'a-off', name: 'demo-runner-mac', connected: false, host: host('macbook') }),
  agent({ id: 'a-never', name: 'staging-runner', connected: false, lastSeen: '' }),
  agent({ id: 'a-disabled', name: 'gpu-runner', isActive: false, host: host('gpu-01') }),
];

const stats = (completed: number, failed: number): AgentStats => ({
  total: completed + failed,
  pending: 0,
  running: 0,
  completed,
  failed,
  cancelled: 0,
  orphaned: 0,
  lastRunAt: NOW,
  daily: [
    {
      day: NOW,
      completed,
      failed,
      cancelled: 0,
      orphaned: 0,
      medianDurationMs: null,
    },
  ],
  medianDurationMs: null,
  p95DurationMs: null,
});

const grantOn = (scope: AppAccess['scope'], name = ''): AppAccess => ({
  grantId: `grant-${scope}-${name}`,
  scope,
  scopeId: scope === 'system' ? '' : `${scope}-1`,
  organizationId: scope === 'system' ? null : 'org-1',
  organizationName: scope === 'system' ? '' : 'Acme',
  projectName: scope === 'project' ? name : '',
  roleId: 'role-1',
  roleName: 'Agent',
});

const ACCESS: Record<string, AppAccess[]> = {
  'a-idle': [grantOn('project', 'prelude')],
  'a-run': [grantOn('project', 'vitrine'), grantOn('project', 'docs')],
  'a-off': [grantOn('organization')],
  'a-never': [grantOn('system')],
  'a-disabled': [],
};

let listAgents: ReturnType<typeof vi.fn>;
let createAgent: ReturnType<typeof vi.fn>;
let deleteAgent: ReturnType<typeof vi.fn>;
let getAgentStats: Mock<(id: string) => Promise<ScyllaResult<AgentStats>>>;
let setAppActive: ReturnType<typeof vi.fn>;
let listAppAccess: Mock<(id: string) => Promise<ScyllaResult<AppAccess[]>>>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let nav: ReturnType<typeof installTestNavigator>;

const grant = (permissions: Permission[] | 'all') =>
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
  });

const rowOf = (name: string) => {
  const row = screen.getByRole('button', { name }).closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return within(row);
};

const jobsTile = () => {
  const tile = screen.getByText('Finished jobs, last 30 days').parentElement;
  if (!tile) throw new Error('no jobs tile');
  return within(tile);
};

const openMenuOf = async (name: string) => {
  await userEvent.click(rowOf(name).getByRole('button', { name: 'Agent actions' }));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));

  listAgents = vi.fn().mockResolvedValue(ScyllaResult.success(AGENTS));
  createAgent = vi
    .fn()
    .mockResolvedValue(
      ScyllaResult.success({ agent: agent({ id: 'agent-new' }), secret: 'sk-once' }),
    );
  deleteAgent = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  getAgentStats = vi.fn((id: string) =>
    Promise.resolve(
      ScyllaResult.success(
        id === 'a-idle' ? stats(41, 1) : id === 'a-run' ? stats(7, 1) : stats(0, 0),
      ),
    ),
  );
  setAppActive = vi.fn().mockResolvedValue(ScyllaResult.success({}));
  listAppAccess = vi.fn((id: string) => Promise.resolve(ScyllaResult.success(ACCESS[id] ?? [])));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    agents: {
      agentsRepository: {
        listAgents,
        createAgent,
        deleteAgent,
        getAgent: vi.fn(),
        getAgentStats,
      },
    },
    apps: {
      appsRepository: {
        setAppActive,
        listAppAccess,
        listAppSecrets: vi.fn().mockResolvedValue(ScyllaResult.success([])),
      },
      resetAppSecret: { execute: vi.fn() },
    },
    project: {
      projectRepository: {
        getByOrganizationId: vi.fn().mockResolvedValue(ScyllaResult.success({ projects: [] })),
      },
    },
  });

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  nav = installTestNavigator({ pathname: '/acme/agents' });
  grant('all');
});

afterEach(() => {
  vi.useRealTimers();
  cache.restore();
  restoreRegistry();
  nav.restore();
  permissionsStore.setState({ permissions: null });
});

describe('AgentsPage', () => {
  it('lists the agents of the organization, one row each', async () => {
    render(AgentsPage);

    expect(await screen.findByRole('button', { name: 'prelude-deployer' })).toBeInTheDocument();
    expect(listAgents).toHaveBeenCalledWith('org-1');
    expect(screen.getAllByRole('row')).toHaveLength(AGENTS.length + 1);
  });

  it('maps each agent to its state: idle, running, offline, never connected, disabled', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(rowOf('prelude-deployer').getByRole('img', { name: 'Agent idle' })).toBeInTheDocument();
    expect(rowOf('prelude-deployer').getByText('Idle')).toBeInTheDocument();
    expect(rowOf('prelude-deployer').getByText('Connected')).toBeInTheDocument();
    expect(rowOf('vitrine-deployer').getByText('Running 2 jobs')).toBeInTheDocument();
    expect(rowOf('vitrine-deployer').getByText('Connected')).toBeInTheDocument();
    expect(
      rowOf('vitrine-deployer').getByRole('img', { name: 'Agent running a job' }),
    ).toBeInTheDocument();
    expect(rowOf('demo-runner-mac').getByText('Offline')).toBeInTheDocument();
    expect(rowOf('demo-runner-mac').getByText(/^Last seen/)).toBeInTheDocument();
    expect(rowOf('staging-runner').getByText('Never connected')).toBeInTheDocument();
    expect(rowOf('staging-runner').queryByText(/^(Connected|Last seen)/)).not.toBeInTheDocument();
    expect(rowOf('gpu-runner').getByText('Disabled')).toBeInTheDocument();
    expect(rowOf('gpu-runner').getByText(/^Since /)).toBeInTheDocument();
  });

  it('sums up the organization: online, running now, needs attention, finished jobs of 30 days', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(screen.getByText('2 of 5')).toBeInTheDocument();
    expect(screen.getByText('1 is running a job')).toBeInTheDocument();
    expect(screen.getByText('2 jobs')).toBeInTheDocument();
    expect(screen.getByText('1 offline, 1 never connected')).toBeInTheDocument();
    expect(await jobsTile().findByText('50')).toBeInTheDocument();
    expect(jobsTile().getByText('96% succeeded')).toBeInTheDocument();
    expect(jobsTile().queryByText(/^Partial/)).not.toBeInTheDocument();
  });

  it('waits for the stats of every agent rather than show a partial sum', async () => {
    getAgentStats.mockImplementation((id: string) =>
      id === 'a-run' ? new Promise(() => {}) : Promise.resolve(ScyllaResult.success(stats(41, 1))),
    );
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });
    await rowOf('prelude-deployer').findByRole('img', { name: '42 jobs in the last 30 days' });

    expect(jobsTile().queryByText(/^\d+$/)).not.toBeInTheDocument();
    expect(jobsTile().queryByText(/succeeded/)).not.toBeInTheDocument();
  });

  it('counts the stats it has, and says how many agents it could not count', async () => {
    getAgentStats.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'a-run'
          ? ScyllaResult.error(new ScyllaError('boom', { cause: { code: 'INTERNAL' } }))
          : ScyllaResult.success(id === 'a-idle' ? stats(41, 1) : stats(0, 0)),
      ),
    );
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(await jobsTile().findByText('42')).toBeInTheDocument();
    expect(jobsTile().getByText('Partial: 1 agent not counted')).toBeInTheDocument();
  });

  it('says every agent waits only when one is online, and that none is online otherwise', async () => {
    listAgents.mockResolvedValue(ScyllaResult.success([AGENTS[0]]));
    const { unmount } = render(AgentsPage);
    expect(await screen.findByText('Every agent waits')).toBeInTheDocument();
    unmount();
    cache.queryClient.clear();

    listAgents.mockResolvedValue(ScyllaResult.success([AGENTS[2], AGENTS[3]]));
    render(AgentsPage);
    expect(await screen.findByText('No agent online')).toBeInTheDocument();
    expect(screen.queryByText('Every agent waits')).not.toBeInTheDocument();
  });

  it('shows the host, or says it is not reported before the first connection', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(rowOf('prelude-deployer').getByText('v0.5.0')).toBeInTheDocument();
    expect(rowOf('prelude-deployer').getByText('linux/amd64 · 4 CPU · 8 GB')).toBeInTheDocument();
    expect(rowOf('staging-runner').getByText('Not reported yet')).toBeInTheDocument();
  });

  it('shows one access badge per scope type, and counts the other grants', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(await rowOf('prelude-deployer').findByText('prelude')).toBeInTheDocument();
    expect(rowOf('demo-runner-mac').getByText('All projects')).toBeInTheDocument();
    expect(rowOf('staging-runner').getByText('All organizations')).toBeInTheDocument();
    expect(rowOf('vitrine-deployer').getByText('vitrine')).toBeInTheDocument();
    expect(rowOf('vitrine-deployer').getByText('+1')).toBeInTheDocument();
    expect(rowOf('gpu-runner').getByText('No grant')).toBeInTheDocument();
  });

  it('prefers a grant of this organization, and names the organization of the others', async () => {
    const globex = (scope: AppAccess['scope']): AppAccess => ({
      ...grantOn(scope),
      grantId: `globex-${scope}`,
      organizationId: 'org-2',
      organizationName: 'Globex',
    });
    listAppAccess.mockImplementation((id: string) =>
      Promise.resolve(
        ScyllaResult.success(
          id === 'a-run'
            ? [globex('organization'), grantOn('project', 'vitrine')]
            : id === 'a-off'
              ? [globex('organization')]
              : (ACCESS[id] ?? []),
        ),
      ),
    );
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(await rowOf('vitrine-deployer').findByText('vitrine')).toBeInTheDocument();
    expect(rowOf('vitrine-deployer').getByText('+1')).toBeInTheDocument();
    expect(rowOf('demo-runner-mac').getByText('All projects of Globex')).toBeInTheDocument();
  });

  it('draws the jobs of 30 days with their success rate, or says there is none', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    expect(
      await rowOf('prelude-deployer').findByRole('img', { name: '42 jobs in the last 30 days' }),
    ).toBeInTheDocument();
    expect(rowOf('prelude-deployer').getByText(/42\s+· 98%/)).toBeInTheDocument();
    expect(rowOf('staging-runner').getByText('No job yet')).toBeInTheDocument();
  });

  it('filters by state and searches the name and the host', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    await userEvent.click(screen.getByRole('radio', { name: /Offline/ }));
    expect(screen.queryByRole('button', { name: 'prelude-deployer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'demo-runner-mac' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /All/ }));
    await userEvent.type(screen.getByRole('searchbox'), 'gpu-01');
    expect(screen.getByRole('button', { name: 'gpu-runner' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'demo-runner-mac' })).not.toBeInTheDocument();
  });

  it('opens the agent when its row is clicked', async () => {
    render(AgentsPage);

    await userEvent.click(await screen.findByRole('button', { name: 'prelude-deployer' }));

    expect(nav.navigate).toHaveBeenCalledWith('/acme/agents/a-idle', undefined);
  });

  it('offers every action of the menu to a user who holds the permissions', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    await openMenuOf('prelude-deployer');

    for (const item of ['Open', 'Copy ID', 'Reset secret', 'Disable', 'Delete']) {
      expect(await findFloating('menuitem', item)).toBeInTheDocument();
    }
  });

  it('keeps only Open and Copy ID without DELETE_APP', async () => {
    grant([Permission.LIST_AGENTS, Permission.READ_APP, Permission.READ_APP_STATS]);
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    await openMenuOf('prelude-deployer');

    expect(await findFloating('menuitem', 'Open')).toBeInTheDocument();
    expect(await findFloating('menuitem', 'Copy ID')).toBeInTheDocument();
    for (const item of ['Reset secret', 'Disable', 'Delete']) {
      await expect(findFloating('menuitem', item)).rejects.toThrow();
    }
    expect(
      rowOf('staging-runner').queryByRole('button', { name: 'Show the run command' }),
    ).toBeNull();
  });

  it('disables an agent only after the confirmation', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    await openMenuOf('demo-runner-mac');
    await userEvent.click(await findFloating('menuitem', 'Disable'));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Disable demo-runner-mac?')).toBeInTheDocument();
    expect(setAppActive).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Disable agent' }));
    await vi.waitFor(() => expect(setAppActive).toHaveBeenCalledWith('a-off', false));
  });

  it('enables a disabled agent at once: it needs no confirmation', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'gpu-runner' });

    await openMenuOf('gpu-runner');
    await userEvent.click(await findFloating('menuitem', 'Enable'));

    await vi.waitFor(() => expect(setAppActive).toHaveBeenCalledWith('a-disabled', true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('opens the reset flow from "Show the run command": the only way to get a secret again', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'staging-runner' });

    await userEvent.click(
      rowOf('staging-runner').getByRole('button', { name: 'Show the run command' }),
    );

    expect(await screen.findByText('Reset the secret of staging-runner?')).toBeInTheDocument();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('asks for confirmation before deleting, and deletes only on confirm', async () => {
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    await openMenuOf('prelude-deployer');
    await userEvent.click(await findFloating('menuitem', 'Delete'));

    expect(await screen.findByText('Delete prelude-deployer?')).toBeInTheDocument();
    expect(deleteAgent).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete agent' }));
    await vi.waitFor(() => expect(deleteAgent).toHaveBeenCalledWith('a-idle'));
  });

  it('takes a deleted agent out of the list at once, before the refetch, and asks nothing more about it', async () => {
    const onQueryError = vi.fn();
    cache.queryClient.getQueryCache().config.onError = onQueryError;
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });
    await vi.waitFor(() => expect(getAgentStats).toHaveBeenCalledWith('a-idle'));
    const notFound = <T>() =>
      ScyllaResult.error<T>(
        new ScyllaError("App 'a-idle' not found", { cause: { code: 'NOT_FOUND' } }),
      );
    getAgentStats.mockImplementation(id =>
      Promise.resolve(id === 'a-idle' ? notFound<AgentStats>() : ScyllaResult.success(stats(0, 0))),
    );
    listAppAccess.mockImplementation(id =>
      Promise.resolve(
        id === 'a-idle' ? notFound<AppAccess[]>() : ScyllaResult.success(ACCESS[id] ?? []),
      ),
    );
    listAgents.mockReturnValue(new Promise(() => {}));
    const callsFor = (spy: Mock<(id: string) => unknown>) =>
      spy.mock.calls.filter(([id]) => id === 'a-idle').length;
    const statsCalls = callsFor(getAgentStats);
    const accessCalls = callsFor(listAppAccess);

    await openMenuOf('prelude-deployer');
    await userEvent.click(await findFloating('menuitem', 'Delete'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete agent' }));

    await vi.waitFor(() =>
      expect(screen.queryByRole('button', { name: 'prelude-deployer' })).not.toBeInTheDocument(),
    );
    expect(listAgents).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'vitrine-deployer' })).toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callsFor(getAgentStats)).toBe(statsCalls);
    expect(callsFor(listAppAccess)).toBe(accessCalls);
    expect(onQueryError).not.toHaveBeenCalled();
  });

  it('explains the empty state and offers to create the first agent', async () => {
    listAgents.mockResolvedValue(ScyllaResult.success([]));
    render(AgentsPage);

    expect(await screen.findByText('No agent yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first agent' })).toBeInTheDocument();
  });

  it('does not offer to create without CREATE_AGENT', async () => {
    listAgents.mockResolvedValue(ScyllaResult.success([]));
    grant([Permission.LIST_AGENTS]);
    render(AgentsPage);

    await screen.findByText('No agent yet');
    expect(
      screen.queryByRole('button', { name: 'Create your first agent' }),
    ).not.toBeInTheDocument();
  });

  it('reports a failed load rather than an empty list', async () => {
    listAgents.mockResolvedValue(
      ScyllaResult.error(new ScyllaError('boom', { cause: { code: 'INTERNAL' } })),
    );
    render(AgentsPage);

    expect(await screen.findByText('Error loading agents')).toBeInTheDocument();
  });

  it('creates an agent from the new agent dialog, and shows its secret in step 2', async () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          // The page header follows a media query.
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    render(AgentsPage);
    await screen.findByRole('button', { name: 'prelude-deployer' });

    await userEvent.click(screen.getByRole('button', { name: 'New agent' }));
    const dialog = within(await screen.findByRole('dialog'));
    await focusSettled();
    await userEvent.type(dialog.getByRole('textbox', { name: 'Name' }), 'runner-9');
    await userEvent.click(dialog.getByRole('button', { name: 'Create agent' }));

    await vi.waitFor(() => expect(createAgent).toHaveBeenCalled());
    expect(createAgent.mock.lastCall).toEqual(['org-1', 'runner-9']);
    await userEvent.click(await screen.findByRole('button', { name: 'Show the secret' }));
    expect(screen.getByText('sk-once')).toBeInTheDocument();
  });
});
