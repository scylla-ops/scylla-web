// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import type { AgentsRepository } from '@base/features/agents/domain/repository/agents.repository.ts';
import {
  APPS_QUERY_KEY,
  APP_ACCESS_QUERY_KEY,
  APP_QUERY_KEY,
  APP_SECRETS_QUERY_KEY,
} from '@base/features/apps';
import {
  AGENTS_QUERY_KEY,
  AGENT_JOBS_QUERY_KEY,
  AGENT_QUERY_KEY,
  AGENT_STATS_QUERY_KEY,
  RECENT_JOBS_LIMIT,
  agentMutations,
  agentQueries,
} from '../agents.queries.ts';

const agent = {
  id: 'agent-1',
  organizationId: 'org-1',
  name: 'runner-1',
  isActive: true,
  connected: true,
  lastSeen: '',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
};

let repository: AgentsRepository;
let setAppActive: ReturnType<typeof vi.fn>;
let invalidate: ReturnType<typeof vi.fn>;
let queryClient: QueryClient;

const restrictTo = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

const grantEverything = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

beforeEach(() => {
  repository = {
    listAgents: vi.fn().mockResolvedValue([agent]),
    getAgent: vi.fn().mockResolvedValue(agent),
    getAgentStats: vi.fn().mockResolvedValue({ daily: [] }),
    createAgent: vi.fn().mockResolvedValue({ agent, secret: 'sk-once' }),
    deleteAgent: vi.fn().mockResolvedValue(undefined),
    listJobs: vi.fn().mockResolvedValue([]),
    listPipelineNames: vi.fn().mockResolvedValue([]),
  };

  setAppActive = vi.fn().mockResolvedValue({ id: 'agent-1' });

  setDependencyRegistry({
    agents: { agentsRepository: repository },
    apps: { appsRepository: { setAppActive } },
  });

  queryClient = new QueryClient();
  invalidate = vi.fn();
  queryClient.invalidateQueries = invalidate as unknown as QueryClient['invalidateQueries'];
  setQueryClient(queryClient);

  contextStore.setState({
    organization: { id: 'org-1', name: 'Acme' },
    project: { id: null, name: null },
  });
  grantEverything();
});

afterEach(() => {
  setDependencyRegistry(null);
  setQueryClient(null);
  permissionsStore.setState({ permissions: null });
});

describe('agentQueries', () => {
  it('lists the agents of one organization', async () => {
    const options = agentQueries.byOrganization('org-1');

    expect(options.queryKey).toEqual(AGENTS_QUERY_KEY('org-1'));
    await expect(runQueryFn(options)).resolves.toEqual([agent]);
    expect(repository.listAgents).toHaveBeenCalledWith('org-1');
  });

  it('refuses to ask for a list the caller may not see', () => {
    // Without LIST_AGENTS the call is denied and the global handler would toast it.
    permissionsStore.setState({ permissions: { scopes: [] } });

    expect(agentQueries.byOrganization('org-1').enabled).toBe(false);
  });

  it('gates the stats query on its own permission, separately from the list', () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.LIST_AGENTS] },
          },
        ],
      },
    });

    expect(agentQueries.byOrganization('org-1').enabled).toBe(true);
    expect(agentQueries.statsOf('agent-1').enabled).toBe(false);
  });

  it('stays disabled without an id, rather than fetching for an empty one', () => {
    expect(agentQueries.byOrganization('').enabled).toBe(false);
    expect(agentQueries.byId('').enabled).toBe(false);
    expect(agentQueries.statsOf('').enabled).toBe(false);
  });

  it('keeps polling so online/offline and last-seen stay fresh, but not in a hidden tab', () => {
    const options = agentQueries.byOrganization('org-1');

    expect(options.refetchInterval).toBe(10_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

  it('asks the first page of the jobs of one agent, on its own permission', async () => {
    const options = agentQueries.recentJobsOf('org-1', 'agent-1');

    expect(options.queryKey).toEqual(AGENT_JOBS_QUERY_KEY('agent-1'));
    await runQueryFn(options);
    expect(repository.listJobs).toHaveBeenCalledWith('org-1', 'agent-1', RECENT_JOBS_LIMIT);

    restrictTo([Permission.READ_APP]);
    expect(agentQueries.recentJobsOf('org-1', 'agent-1').enabled).toBe(false);
  });

  it('asks the pipeline names only once a job shows, and with LIST_PIPELINES_BY_ORGANIZATION', () => {
    expect(agentQueries.pipelineNames('org-1', false).enabled).toBe(false);
    expect(agentQueries.pipelineNames('org-1', true).enabled).toBe(true);

    restrictTo([Permission.LIST_JOBS_BY_ORGANIZATION]);
    expect(agentQueries.pipelineNames('org-1', true).enabled).toBe(false);
  });

  it('gives an agent, its detail and its stats three distinct cache entries', () => {
    expect(AGENT_QUERY_KEY('agent-1')).not.toEqual(AGENT_STATS_QUERY_KEY('agent-1'));
    expect(AGENTS_QUERY_KEY('org-1')).not.toEqual(AGENT_QUERY_KEY('agent-1'));
  });
});

describe('agentMutations', () => {
  it('creates an agent with its name only, and invalidates the list it now belongs to', async () => {
    const options = agentMutations.create('org-1');
    const variables = { name: 'runner-1' };

    const created = await runMutationFn(options, variables);
    expect(vi.mocked(repository.createAgent).mock.lastCall).toEqual(['org-1', 'runner-1']);
    expect(created.secret).toBe('sk-once');

    runOnSuccess(options, created, variables);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AGENTS_QUERY_KEY('org-1') });
  });

  it('takes a deleted agent out of the cached list and drops its own entries before the refetch', async () => {
    const other = { ...agent, id: 'agent-2', name: 'runner-2' };
    const own = [
      AGENT_QUERY_KEY('agent-1'),
      AGENT_STATS_QUERY_KEY('agent-1'),
      AGENT_JOBS_QUERY_KEY('agent-1'),
      APP_QUERY_KEY('agent-1'),
      APP_SECRETS_QUERY_KEY('agent-1'),
      APP_ACCESS_QUERY_KEY('agent-1'),
    ];
    queryClient.setQueryData(AGENTS_QUERY_KEY('org-1'), [agent, other]);
    for (const queryKey of own) queryClient.setQueryData(queryKey, {});
    queryClient.setQueryData(AGENT_STATS_QUERY_KEY('agent-2'), {});
    const cancel = vi.spyOn(queryClient, 'cancelQueries');
    let listAtRefetch: unknown;
    invalidate.mockImplementation(() => {
      listAtRefetch = queryClient.getQueryData(AGENTS_QUERY_KEY('org-1'));
    });
    const options = agentMutations.remove('org-1');

    await runMutationFn(options, 'agent-1');
    expect(repository.deleteAgent).toHaveBeenCalledWith('agent-1');

    runOnSuccess(options, undefined, 'agent-1');
    await vi.waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: AGENTS_QUERY_KEY('org-1') }),
    );
    expect(listAtRefetch).toEqual([other]);
    expect(cancel).toHaveBeenCalledWith({ queryKey: AGENTS_QUERY_KEY('org-1'), exact: true });
    for (const queryKey of own) {
      expect(cancel).toHaveBeenCalledWith({ queryKey, exact: true });
      expect(queryClient.getQueryState(queryKey)).toBeUndefined();
    }
    expect(queryClient.getQueryData(AGENT_STATS_QUERY_KEY('agent-2'))).toEqual({});
  });

  it('disables an agent through SetAppActive and refreshes the agent entries as well as the app ones', async () => {
    const options = agentMutations.setActive('org-1');
    const variables = { appId: 'agent-1', active: false };

    await runMutationFn(options, variables);
    expect(setAppActive).toHaveBeenCalledWith('agent-1', false);

    runOnSuccess(options, { id: 'agent-1' } as never, variables);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AGENTS_QUERY_KEY('org-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AGENT_QUERY_KEY('agent-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APPS_QUERY_KEY('org-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APP_QUERY_KEY('agent-1') });
  });
});
