// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IAppServiceClient } from '@base/generated/scylla/apps/v1/app_service.client.ts';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { IAgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import type { ICapabilityServiceClient } from '@base/generated/scylla/capabilities/v1/capability_service.client.ts';
import { type App, CiProvider } from '@base/generated/scylla/apps/v1/app.ts';
import { TokenExpiry, TokenPreset } from '@base/generated/scylla/auth/v1/api_token.ts';
import { JobStatus } from '@base/generated/scylla/pipelines/v1/job.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultAppsRepository } from '../default-apps.repository.ts';
import { toDomain } from '../grpc-app.mapper.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const wireApp = (overrides: Partial<App> = {}): App => ({
  id: { value: 'app-1' },
  workspaceId: { value: 'ws-1' },
  name: 'builder',
  runner: true,
  connected: false,
  createdBy: { value: 'u-1' },
  createdAt: TS,
  runningJobs: 0,
  ...overrides,
});

const clients = () => {
  const apps = {
    listApps: vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { apps: [wireApp()], page: { nextToken: 'n' } }
          : { apps: [wireApp({ id: { value: 'app-2' } })], page: { nextToken: '' } },
      ),
    ),
    getApp: vi.fn(() =>
      unaryCall({
        app: wireApp(),
        keys: [
          {
            id: { value: 'key-1' },
            label: 'ci-1',
            publicKey: new Uint8Array(),
            createdAt: TS,
            lastUsedAt: TS,
          },
        ],
      }),
    ),
    createApp: vi.fn(() =>
      unaryCall({ app: wireApp(), joinCode: 'JOIN-1', joinCodeExpiresAt: TS }),
    ),
    createJoinCode: vi.fn(() => unaryCall({ joinCode: 'JOIN-2', expiresAt: TS })),
    revokeAppKey: vi.fn(() => unaryCall({})),
    deleteApp: vi.fn(() => unaryCall({})),
    createAppToken: vi.fn(() =>
      unaryCall({
        token: {
          id: { value: 't-1' },
          name: 'ci',
          hint: 'scya_...abcd',
          createdAt: TS,
          expiresAt: TS,
        },
        secret: 'scya_secret',
      }),
    ),
    addCiIdentity: vi.fn(() =>
      unaryCall({
        identity: {
          id: { value: 'ci-1' },
          provider: CiProvider.GITLAB,
          issuer: 'https://gitlab.com',
          repository: 'group/project',
          gitRef: '',
          environment: 'prod',
          createdAt: TS,
        },
      }),
    ),
  } as unknown as IAppServiceClient;
  const jobs = {
    listWorkspaceJobs: vi.fn(() =>
      unaryCall({
        jobs: [
          {
            id: { value: 'old' },
            pipelineId: { value: 'p' },
            projectId: { value: 'pr' },
            status: JobStatus.COMPLETED,
            nodes: [],
            runs: [],
            error: '',
            createdAt: { seconds: 1n, nanos: 0 },
          },
          {
            id: { value: 'new' },
            pipelineId: { value: 'p' },
            projectId: { value: 'pr' },
            status: JobStatus.RUNNING,
            nodes: [],
            runs: [],
            error: '',
            createdAt: TS,
            startedAt: TS,
          },
        ],
      }),
    ),
  } as unknown as IJobServiceClient;
  const order: string[] = [];
  const access = {
    grant: vi.fn(() => {
      order.push('grant');
      return unaryCall({});
    }),
    revoke: vi.fn(() => {
      order.push('revoke');
      return unaryCall({});
    }),
  } as unknown as IAccessServiceClient;
  const agents = {
    getAgentStats: vi.fn(() =>
      unaryCall({
        stats: {
          agentId: { value: 'app-1' },
          outcomes: { completed: 3, failed: 1, cancelled: 0, orphaned: 0 },
          medianDuration: { seconds: 2n, nanos: 500_000_000 },
          days: [{ day: TS, outcomes: { completed: 3, failed: 1, cancelled: 0, orphaned: 0 } }],
        },
      }),
    ),
  } as unknown as IAgentServiceClient;
  const capabilities = {
    getCapabilities: vi.fn(() =>
      unaryCall({
        edition: 'community',
        capabilities: [],
        version: '0.7.0',
        agentImage: 'ghcr.io/scylla-ops/scylla-agent:0.7.0',
      }),
    ),
  } as unknown as ICapabilityServiceClient;
  const repository = new DefaultAppsRepository(apps, jobs, access, agents, capabilities);
  return { apps, jobs, access, agents, repository, order };
};

describe('getServerInfo', () => {
  it('reads the version and the image of the agent from the capabilities', async () => {
    const { repository } = clients();

    await expect(repository.getServerInfo()).resolves.toEqual({
      version: '0.7.0',
      agentImage: 'ghcr.io/scylla-ops/scylla-agent:0.7.0',
    });
  });
});

describe('grpcApp.toDomain', () => {
  it('has no host before the hello of the agent', () => {
    expect(toDomain(wireApp())).toEqual({
      id: 'app-1',
      workspaceId: 'ws-1',
      name: 'builder',
      runner: true,
      connected: false,
      lastSeenAt: '',
      host: null,
      createdBy: 'u-1',
      createdAt: ISO,
      runningJobs: 0,
      disabledAt: '',
    });
  });

  it('gives the memory in megabytes, and no count for a zero', () => {
    const app = toDomain(
      wireApp({
        host: {
          version: '1.0.0',
          os: 'linux',
          arch: 'x86_64',
          hostname: 'ci-1',
          cpuCount: 0,
          memoryBytes: 2n * 1024n * 1024n * 1024n,
          capacity: 2,
          containerRuntime: 'docker',
        },
      }),
    );

    expect(app.host).toMatchObject({ cpuCount: null, totalMemoryMb: 2048, capacity: 2 });
  });
});

describe('DefaultAppsRepository', () => {
  it('reads every page, with the filter on the agents', async () => {
    const { apps, repository } = clients();

    const list = await repository.listApps('ws-1', true);

    expect(list.map(app => app.id)).toEqual(['app-1', 'app-2']);
    expect(apps.listApps).toHaveBeenCalledWith(expect.objectContaining({ runner: true }));
  });

  it('sends no filter for every app', async () => {
    const { apps, repository } = clients();

    await repository.listApps('ws-1');

    expect(apps.listApps).toHaveBeenCalledWith(expect.not.objectContaining({ runner: true }));
  });

  it('gives the first join code of a new agent, and the runner role', async () => {
    const { access, repository } = clients();

    await expect(repository.createApp('ws-1', 'builder', true)).resolves.toMatchObject({
      app: { id: 'app-1' },
      joinCode: { code: 'JOIN-1', expiresAt: ISO },
    });
    expect(access.grant).toHaveBeenCalledWith({
      object: { kind: 'workspace', id: { value: 'ws-1' } },
      role: 'runner',
      actorId: { value: 'app-1' },
    });
  });

  it('gives no role to an app that runs no job', async () => {
    const { access, repository } = clients();

    await repository.createApp('ws-1', 'ci', false);

    expect(access.grant).not.toHaveBeenCalled();
  });

  it('gives the keys of an app with the app', async () => {
    const { repository } = clients();

    const details = await repository.getApp('app-1');

    expect(details.keys).toEqual([
      { id: 'key-1', label: 'ci-1', createdAt: ISO, revokedAt: '', lastUsedAt: ISO },
    ]);
  });

  it('reads the jobs of the agent, newest first', async () => {
    const { jobs, repository } = clients();

    const list = await repository.listJobs('ws-1', 'app-1', 50);

    expect(jobs.listWorkspaceJobs).toHaveBeenCalledWith({
      workspaceId: { value: 'ws-1' },
      agentId: { value: 'app-1' },
      page: { size: 50, token: '' },
    });
    expect(list.map(job => job.id)).toEqual(['new', 'old']);
    expect(list[0].status).toBe('running');
  });

  it('revokes one key of an app', async () => {
    const { apps, repository } = clients();

    await repository.revokeKey('app-1', 'key-1');

    expect(apps.revokeAppKey).toHaveBeenCalledWith({
      appId: { value: 'app-1' },
      keyId: { value: 'key-1' },
    });
  });
});

describe('DefaultAppsRepository, the stats and the credentials', () => {
  it('reads the stats of the server, with the durations in milliseconds', async () => {
    const { repository } = clients();

    const stats = await repository.getAgentStats('app-1');

    expect(stats.medianMs).toBe(2500);
    expect(stats.p95Ms).toBeNull();
    expect(stats.days).toEqual([
      { day: ISO, outcomes: { completed: 3, failed: 1, cancelled: 0, orphaned: 0 } },
    ]);
  });

  it('asks for no period by default, and for the start of each UTC day of a period', async () => {
    const { agents, repository } = clients();

    await repository.getAgentStats('app-1');
    await repository.getAgentStats('app-1', { from: '2026-10-11', to: '2026-11-09' });

    expect(agents.getAgentStats).toHaveBeenNthCalledWith(1, {
      agentId: { value: 'app-1' },
      from: undefined,
      to: undefined,
    });
    expect(agents.getAgentStats).toHaveBeenNthCalledWith(2, {
      agentId: { value: 'app-1' },
      from: { seconds: BigInt(Date.UTC(2026, 9, 11) / 1000), nanos: 0 },
      to: { seconds: BigInt(Date.UTC(2026, 10, 9) / 1000), nanos: 0 },
    });
  });

  it('gives an agent of some projects the runner role on each project', async () => {
    const { access, repository } = clients();

    await repository.createApp('ws-1', 'builder', true, ['p-1', 'p-2']);

    expect(access.grant).toHaveBeenCalledTimes(2);
    expect(access.grant).toHaveBeenCalledWith({
      object: { kind: 'project', id: { value: 'p-2' } },
      role: 'runner',
      actorId: { value: 'app-1' },
    });
  });

  it('keeps the new agent and says so when its role cannot be given', async () => {
    const { access, repository } = clients();
    vi.mocked(access.grant).mockImplementationOnce(() => {
      throw new Error('PERMISSION_DENIED');
    });

    const created = await repository.createApp('ws-1', 'builder', true);

    expect(created.app.id).toBe('app-1');
    expect(created.accessGranted).toBe(false);
  });

  it('changes the runner roles of an agent in the given order', async () => {
    const { access, repository, order } = clients();

    await repository.changeRunner('ws-1', 'app-1', [
      { kind: 'grant', projectId: 'p-1' },
      { kind: 'revoke', projectId: null },
    ]);

    expect(order).toEqual(['grant', 'revoke']);
    expect(access.grant).toHaveBeenCalledWith({
      object: { kind: 'project', id: { value: 'p-1' } },
      role: 'runner',
      actorId: { value: 'app-1' },
    });
    expect(access.revoke).toHaveBeenCalledWith({
      object: { kind: 'workspace', id: { value: 'ws-1' } },
      role: 'runner',
      actorId: { value: 'app-1' },
    });
  });

  it('sends the expiry and the limits of a token, and gives its secret one time', async () => {
    const { apps, repository } = clients();

    const created = await repository.createToken('app-1', {
      name: 'ci',
      expiry: 30,
      limits: { preset: 'deploy', actions: ['ignored'], projectIds: ['p-1'] },
    });

    expect(created.secret).toBe('scya_secret');
    expect(created.token).toMatchObject({ id: 't-1', hint: 'scya_...abcd', revokedAt: '' });
    expect(created.token.limits.preset).toBe('read_only');
    expect(apps.createAppToken).toHaveBeenCalledWith({
      appId: { value: 'app-1' },
      name: 'ci',
      expiry: TokenExpiry.DAYS_30,
      limits: { preset: TokenPreset.DEPLOY, actions: [], projectIds: [{ value: 'p-1' }] },
    });
  });

  it('reads the provider of a CI identity', async () => {
    const { repository } = clients();

    const identity = await repository.addCiIdentity('app-1', {
      provider: 'gitlab',
      issuer: '',
      repository: 'group/project',
      gitRef: '',
      environment: 'prod',
      limits: { preset: 'read_only', actions: [], projectIds: [] },
    });

    expect(identity).toMatchObject({ provider: 'gitlab', environment: 'prod', lastUsedAt: '' });
  });
});
