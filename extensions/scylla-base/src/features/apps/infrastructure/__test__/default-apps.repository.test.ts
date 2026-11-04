// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IAppServiceClient } from '@base/generated/scylla/apps/v1/app_service.client.ts';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { App } from '@base/generated/scylla/apps/v1/app.ts';
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
  createdAt: TS,
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
        keys: [{ id: { value: 'key-1' }, publicKey: new Uint8Array(), createdAt: TS }],
      }),
    ),
    createApp: vi.fn(() =>
      unaryCall({ app: wireApp(), joinCode: 'JOIN-1', joinCodeExpiresAt: TS }),
    ),
    createJoinCode: vi.fn(() => unaryCall({ joinCode: 'JOIN-2', expiresAt: TS })),
    revokeAppKey: vi.fn(() => unaryCall({})),
    deleteApp: vi.fn(() => unaryCall({})),
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
  const access = { grant: vi.fn(() => unaryCall({})) } as unknown as IAccessServiceClient;
  return { apps, jobs, access, repository: new DefaultAppsRepository(apps, jobs, access) };
};

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
      createdAt: ISO,
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

    expect(details.keys).toEqual([{ id: 'key-1', createdAt: ISO, revokedAt: '' }]);
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
