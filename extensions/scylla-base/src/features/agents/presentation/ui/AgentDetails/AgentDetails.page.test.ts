import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { AppAccess, AppSecretEntity } from '@base/features/apps';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import type { AgentStats } from '@base/features/agents/domain/structs/agent.struct.ts';
import {
  AGENTS_QUERY_KEY,
  AGENT_QUERY_KEY,
  AGENT_STATS_QUERY_KEY,
} from '@base/features/agents/presentation/agents.queries.ts';
import AgentsPage from '../Agents/Agents.page.svelte';
import AgentDetailsPage from './AgentDetails.page.svelte';

const NOW = '2026-10-11T08:00:00.000Z';

const agent = (overrides: Partial<AgentEntity> = {}): AgentEntity => ({
  id: 'agent-1',
  organizationId: 'org-1',
  name: 'prelude-deployer',
  isActive: true,
  connected: true,
  lastSeen: NOW,
  inFlight: 0,
  host: {
    version: '0.5.0',
    os: 'linux',
    arch: 'amd64',
    hostname: 'grok-vps',
    cpuCount: 4,
    totalMemoryMb: 8192,
    reportedAt: NOW,
  },
  createdAt: '2026-10-03T08:00:00.000Z',
  updatedAt: '2026-10-03T08:00:00.000Z',
  ...overrides,
});

const stats: AgentStats = {
  total: 64,
  pending: 0,
  running: 0,
  completed: 61,
  failed: 2,
  cancelled: 1,
  orphaned: 0,
  lastRunAt: NOW,
  daily: [
    { day: NOW, completed: 41, failed: 1, cancelled: 0, orphaned: 0, medianDurationMs: null },
  ],
  medianDurationMs: 102_000,
  p95DurationMs: 250_000,
};

const projectGrant: AppAccess = {
  grantId: 'grant-1',
  scope: 'project',
  scopeId: 'project-1',
  organizationId: 'org-1',
  organizationName: 'Acme',
  projectName: 'prelude',
  roleId: 'role-1',
  roleName: 'Project agent',
};

const defaultSecret: AppSecretEntity = {
  id: 'secret-1',
  appId: 'agent-1',
  label: 'default',
  enabled: true,
  createdAt: '2026-10-03T08:00:00.000Z',
  updatedAt: '',
};

const job = {
  id: '01m4h0x2aaaaaaaaaaaa',
  pipelineId: 'pipeline-1',
  status: 'completed',
  createdAt: NOW,
  startedAt: '2026-10-11T07:58:00.000Z',
  finishedAt: '2026-10-11T07:59:38.000Z',
};

let getAgent: ReturnType<typeof vi.fn>;
let getAgentStats: Mock<(id: string) => Promise<ScyllaResult<AgentStats>>>;
let listAgents: ReturnType<typeof vi.fn>;
let deleteAgent: ReturnType<typeof vi.fn>;
let setAppActive: ReturnType<typeof vi.fn>;
let revokeAppSecret: ReturnType<typeof vi.fn>;
let listJobs: ReturnType<typeof vi.fn>;
let listProjects: ReturnType<typeof vi.fn>;
let listAppAccess: ReturnType<typeof vi.fn>;
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

const heading = () => screen.findByRole('heading', { name: 'prelude-deployer', level: 1 });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));

  getAgent = vi.fn().mockResolvedValue(ScyllaResult.success(agent()));
  getAgentStats = vi.fn().mockResolvedValue(ScyllaResult.success(stats));
  listAgents = vi.fn().mockResolvedValue(ScyllaResult.success([]));
  deleteAgent = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  setAppActive = vi.fn().mockResolvedValue(ScyllaResult.success({}));
  revokeAppSecret = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  listJobs = vi.fn().mockResolvedValue(ScyllaResult.success([job]));
  listProjects = vi
    .fn()
    .mockResolvedValue(ScyllaResult.success({ projects: [{ id: 'project-1', name: 'prelude' }] }));
  listAppAccess = vi.fn().mockResolvedValue(ScyllaResult.success([projectGrant]));

  cache = withQueryClient();
  restoreRegistry = withRegistry({
    agents: {
      agentsRepository: {
        getAgent,
        getAgentStats,
        deleteAgent,
        listAgents,
        createAgent: vi.fn(),
        listJobs,
        listPipelineNames: vi
          .fn()
          .mockResolvedValue(
            ScyllaResult.success([{ id: 'pipeline-1', projectId: 'project-1', name: 'deploy' }]),
          ),
      },
    },
    apps: {
      appsRepository: {
        setAppActive,
        revokeAppSecret,
        setAppSecretEnabled: vi.fn().mockResolvedValue(ScyllaResult.success(defaultSecret)),
        listAppAccess,
        listAppSecrets: vi.fn().mockResolvedValue(ScyllaResult.success([defaultSecret])),
      },
      resetAppSecret: { execute: vi.fn() },
    },
    project: { projectRepository: { getByOrganizationId: listProjects } },
  });

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  nav = installTestNavigator({ pathname: '/acme/agents/agent-1' });
  grant('all');
});

afterEach(() => {
  vi.useRealTimers();
  cache.restore();
  restoreRegistry();
  nav.restore();
  permissionsStore.setState({ permissions: null });
});

describe('AgentDetailsPage', () => {
  it('reads the agent named by the route parameter', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });

    expect(await heading()).toBeInTheDocument();
    expect(getAgent).toHaveBeenCalledWith('agent-1');
  });

  it.each([
    [{}, 'Online, idle', 'Agent idle'],
    [{ inFlight: 1 }, 'Running 1 job', 'Agent running a job'],
    [{ connected: false }, 'Offline', 'Agent offline'],
    [{ connected: false, lastSeen: '' }, 'Never connected', 'Agent never connected'],
    [{ isActive: false }, 'Disabled', 'Agent disabled'],
  ])('shows the state of the agent in its chip and its bot (%o)', async (overrides, chip, bot) => {
    getAgent.mockResolvedValue(ScyllaResult.success(agent(overrides)));
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(screen.getByText(chip)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: bot })).toBeInTheDocument();
  });

  it('warns that a disabled agent cannot sign in, and enables it from the banner', async () => {
    getAgent.mockResolvedValue(ScyllaResult.success(agent({ isActive: false })));
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    const banner = within(screen.getByRole('status'));
    expect(banner.getByText('This agent is disabled')).toBeInTheDocument();

    await userEvent.click(banner.getByRole('button', { name: 'Enable' }));
    await vi.waitFor(() => expect(setAppActive).toHaveBeenCalledWith('agent-1', true));
  });

  it('shows the run command only while the agent never connected', async () => {
    getAgent.mockResolvedValue(ScyllaResult.success(agent({ connected: false, lastSeen: '' })));
    const { unmount } = render(AgentDetailsPage, { agentId: 'agent-1' });
    expect(await screen.findByRole('heading', { name: 'Run this agent' })).toBeInTheDocument();
    unmount();
    cache.queryClient.clear();

    getAgent.mockResolvedValue(ScyllaResult.success(agent()));
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();
    expect(screen.queryByRole('heading', { name: 'Run this agent' })).not.toBeInTheDocument();
  });

  it('gives the key numbers of the last 30 days and the durations', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    const numbers = within(await screen.findByRole('group', { name: 'Key numbers' }));
    expect(await numbers.findByText('42')).toBeInTheDocument();
    expect(numbers.getByText('97.6%')).toBeInTheDocument();
    expect(numbers.getByText('41 of 42 completed')).toBeInTheDocument();
    expect(numbers.getByText('1 min 42 s')).toBeInTheDocument();
    expect(numbers.getByText('4 min 10 s')).toBeInTheDocument();
  });

  it('hides the stats entirely without READ_APP_STATS, rather than showing them empty', async () => {
    grant([Permission.READ_APP, Permission.LIST_JOBS_BY_ORGANIZATION]);
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(screen.queryByRole('group', { name: 'Key numbers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Jobs per day' })).not.toBeInTheDocument();
  });

  it('lists the recent jobs with their project and pipeline names', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    const row = await screen.findByRole('button', { name: 'prelude / deploy, Success, now' });
    expect(within(row).getByText('1 min 38 s')).toBeInTheDocument();
    expect(within(row).getByText(job.id.slice(0, 8), { exact: false })).toBeInTheDocument();
    expect(listJobs).toHaveBeenCalledWith('org-1', 'agent-1', 5);
  });

  it('shows the pipeline alone without LIST_PROJECTS_BY_ORGANIZATION, and asks for no project', async () => {
    grant([
      Permission.READ_APP,
      Permission.LIST_JOBS_BY_ORGANIZATION,
      Permission.LIST_PIPELINES_BY_ORGANIZATION,
    ]);
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(await screen.findByRole('button', { name: 'deploy, Success, now' })).toBeInTheDocument();
    expect(listProjects).not.toHaveBeenCalled();
  });

  it('hides the recent jobs without LIST_JOBS_BY_ORGANIZATION', async () => {
    grant([Permission.READ_APP, Permission.READ_APP_STATS]);
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(screen.queryByRole('heading', { name: 'Recent jobs' })).not.toBeInTheDocument();
    expect(listJobs).not.toHaveBeenCalled();
  });

  it('names the organization of a grant on another organization', async () => {
    listAppAccess.mockResolvedValue(
      ScyllaResult.success([
        {
          ...projectGrant,
          grantId: 'grant-2',
          scope: 'organization',
          scopeId: 'org-2',
          organizationId: 'org-2',
          organizationName: 'Globex',
          projectName: '',
        },
      ]),
    );
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(
      await screen.findByText('It takes the jobs of every project of Globex.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('It takes the jobs of every project of this organization.'),
    ).not.toBeInTheDocument();
  });

  it('says "Connected" for a connected agent, as last_seen moves only on events', async () => {
    getAgent.mockResolvedValue(
      ScyllaResult.success(agent({ lastSeen: '2026-10-11T07:46:00.000Z' })),
    );
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.queryByText(/^Seen|^Last seen/)).not.toBeInTheDocument();
  });

  it('says when an offline agent was last seen, and nothing for one that never connected', async () => {
    getAgent.mockResolvedValue(ScyllaResult.success(agent({ connected: false })));
    const { unmount } = render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();
    expect(screen.getByText(/^Last seen/)).toBeInTheDocument();
    unmount();
    cache.queryClient.clear();

    getAgent.mockResolvedValue(ScyllaResult.success(agent({ connected: false, lastSeen: '' })));
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();
    expect(screen.queryByText(/^(Last seen|Connected)/)).not.toBeInTheDocument();
  });

  it('says where a project agent takes jobs', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(
      await screen.findByText(
        'It takes the jobs of prelude only, and reads only the secrets of prelude.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Project agent')).toBeInTheDocument();
  });

  it('shows the host from the last hello', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    expect(screen.getByText('grok-vps')).toBeInTheDocument();
    expect(screen.getByText('linux/amd64')).toBeInTheDocument();
    expect(screen.getByText('8 GB')).toBeInTheDocument();
  });

  it('revokes a secret only after the confirmation', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions of the secret default' }),
    );
    await userEvent.click(await findFloating('menuitem', 'Revoke'));

    expect(await screen.findByText('Revoke “default”?')).toBeInTheDocument();
    expect(revokeAppSecret).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await vi.waitFor(() => expect(revokeAppSecret).toHaveBeenCalledWith('secret-1'));
  });

  it('asks before disabling from the header', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    await userEvent.click(screen.getByRole('button', { name: 'Disable' }));
    const dialog = within(await screen.findByRole('alertdialog'));
    expect(setAppActive).not.toHaveBeenCalled();

    await userEvent.click(dialog.getByRole('button', { name: 'Disable agent' }));
    await vi.waitFor(() => expect(setAppActive).toHaveBeenCalledWith('agent-1', false));
  });

  it('hides reset, disable, secret actions and delete without DELETE_APP', async () => {
    grant([Permission.READ_APP, Permission.READ_APP_STATS]);
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();
    await screen.findByText('default');

    expect(screen.queryByRole('button', { name: 'Reset secret' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete agent' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions of the secret default' }),
    ).not.toBeInTheDocument();
  });

  it('confirms before deleting, then returns to the list', async () => {
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();

    await userEvent.click(screen.getByRole('button', { name: 'Delete agent' }));
    expect(await screen.findByText('Delete prelude-deployer?')).toBeInTheDocument();
    expect(deleteAgent).not.toHaveBeenCalled();

    const dialog = within(screen.getByRole('alertdialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Delete agent' }));

    await vi.waitFor(() => expect(deleteAgent).toHaveBeenCalledWith('agent-1'));
    await vi.waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('..', undefined));
  });

  it('forgets the deleted agent before it returns to the list, so the list asks nothing about it', async () => {
    const onQueryError = vi.fn();
    cache.queryClient.getQueryCache().config.onError = onQueryError;
    const other = agent({ id: 'agent-2', name: 'vitrine-deployer' });
    cache.queryClient.setQueryData(AGENTS_QUERY_KEY('org-1'), [agent(), other]);
    let listOnLeave: unknown;
    const entriesOnLeave: unknown[] = [];
    nav.navigate.mockImplementation(() => {
      listOnLeave = cache.queryClient.getQueryData(AGENTS_QUERY_KEY('org-1'));
      entriesOnLeave.push(
        cache.queryClient.getQueryState(AGENT_QUERY_KEY('agent-1')),
        cache.queryClient.getQueryState(AGENT_STATS_QUERY_KEY('agent-1')),
      );
    });
    render(AgentDetailsPage, { agentId: 'agent-1' });
    await heading();
    await vi.waitFor(() => expect(getAgentStats).toHaveBeenCalledWith('agent-1'));
    const notFound = <T>() =>
      ScyllaResult.error<T>(
        new ScyllaError("App 'agent-1' not found", { cause: { code: 'NOT_FOUND' } }),
      );
    getAgent.mockResolvedValue(notFound<AgentEntity>());
    getAgentStats.mockImplementation(id =>
      Promise.resolve(id === 'agent-1' ? notFound<AgentStats>() : ScyllaResult.success(stats)),
    );
    listAgents.mockReturnValue(new Promise(() => {}));
    const callsFor = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.filter(([id]) => id === 'agent-1').length;
    const agentCalls = callsFor(getAgent);
    const statsCalls = callsFor(getAgentStats);

    await userEvent.click(screen.getByRole('button', { name: 'Delete agent' }));
    const dialog = within(await screen.findByRole('alertdialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Delete agent' }));
    await vi.waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('..', undefined));

    expect(listOnLeave).toEqual([other]);
    expect(entriesOnLeave).toEqual([undefined, undefined]);

    render(AgentsPage);
    expect(await screen.findByRole('button', { name: 'vitrine-deployer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'prelude-deployer' })).not.toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callsFor(getAgent)).toBe(agentCalls);
    expect(callsFor(getAgentStats)).toBe(statsCalls);
    expect(onQueryError).not.toHaveBeenCalled();
  });

  it('reports a failed load rather than a blank page', async () => {
    getAgent.mockResolvedValue(
      ScyllaResult.error(new ScyllaError('boom', { cause: { code: 'INTERNAL' } })),
    );
    render(AgentDetailsPage, { agentId: 'agent-1' });

    expect(await screen.findByText('Error loading agent')).toBeInTheDocument();
  });

  it('leaves for the list when the agent no longer exists', async () => {
    getAgent.mockResolvedValue(
      ScyllaResult.error(new ScyllaError('gone', { cause: { code: 'NOT_FOUND' } })),
    );
    render(AgentDetailsPage, { agentId: 'agent-1' });

    await vi.waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('..', expect.anything()));
  });

  it('asks for nothing at all without an agent id', () => {
    render(AgentDetailsPage, {});

    expect(getAgent).not.toHaveBeenCalled();
    expect(listJobs).not.toHaveBeenCalled();
  });
});
