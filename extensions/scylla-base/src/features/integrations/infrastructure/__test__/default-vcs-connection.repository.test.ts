// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IVcsConnectionServiceClient } from '@base/generated/scylla/integrations/v1/vcs_connection_service.client.ts';
import {
  AccountKind,
  AuthKind,
  ConnectionState,
  DeliveryMode,
  VcsProvider,
  type VcsConnection,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { DefaultVcsConnectionRepository } from '../default-vcs-connection.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const wire = (patch: Partial<VcsConnection> = {}): VcsConnection => ({
  id: { value: 'c-1' },
  workspaceId: { value: 'ws-1' },
  provider: VcsProvider.GITHUB,
  authKind: AuthKind.APP_INSTALLATION,
  externalId: '42',
  account: 'acme',
  accountKind: AccountKind.ORGANIZATION,
  avatarUrl: 'https://avatars.githubusercontent.com/u/1',
  state: ConnectionState.ACTIVE,
  stateReason: '',
  deliveryMode: DeliveryMode.WEBHOOK,
  pollIntervalSeconds: 120,
  allRepositories: false,
  repositoryCount: 12,
  projectCount: 4,
  scopes: [],
  missingPermissions: ['administration'],
  settingsUrl: 'https://github.com/organizations/acme/settings/installations/42',
  createdBy: { value: 'u-1' },
  createdAt: TS,
  ...patch,
});

/** A fake client with only the calls of the test: `unaryCall` answers with a partial type. */
const repositoryWith = (client: object) =>
  new DefaultVcsConnectionRepository(client as IVcsConnectionServiceClient);

describe('DefaultVcsConnectionRepository', () => {
  it('reads every page of the connections, and drops a provider that this build does not know', async () => {
    const listVcsConnections = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { connections: [wire()], page: { nextToken: 'n' } }
          : {
              connections: [
                wire({
                  id: { value: 'c-2' },
                  provider: VcsProvider.GITLAB,
                  account: 'scylla-bot',
                  accountKind: AccountKind.SERVICE_ACCOUNT,
                  authKind: AuthKind.ACCESS_TOKEN,
                  deliveryMode: DeliveryMode.POLLING,
                  tokenExpiresAt: TS,
                  scopes: ['api'],
                }),
                wire({ id: { value: 'c-3' }, provider: 9 as VcsProvider }),
              ],
              page: { nextToken: '' },
            },
      ),
    );
    const repository = repositoryWith({ listVcsConnections });

    const connections = await repository.listByWorkspace('ws-1');

    expect(listVcsConnections).toHaveBeenCalledTimes(2);
    expect(connections.map(connection => connection.id)).toEqual(['c-1', 'c-2']);
    expect(connections[0]).toEqual({
      id: 'c-1',
      workspaceId: 'ws-1',
      provider: 'github',
      account: 'acme',
      accountKind: 'organization',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
      state: 'active',
      stateReason: '',
      deliveryMode: 'webhook',
      pollIntervalSeconds: 120,
      allRepositories: false,
      repositoryCount: 12,
      projectCount: 4,
      scopes: [],
      missingPermissions: ['administration'],
      settingsUrl: 'https://github.com/organizations/acme/settings/installations/42',
      createdBy: 'u-1',
      createdAt: ISO,
    });
    expect(connections[1]).toMatchObject({
      provider: 'gitlab',
      accountKind: 'service_account',
      deliveryMode: 'polling',
      tokenExpiresAt: ISO,
      scopes: ['api'],
    });
  });

  it('reads a state that this build does not know as needing attention', async () => {
    const getVcsConnection = vi.fn(() =>
      unaryCall({ connection: wire({ state: 9 as ConnectionState }) }),
    );

    const connection = await repositoryWith({ getVcsConnection }).getById('c-1');

    expect(connection.state).toBe('needs_attention');
    expect(getVcsConnection).toHaveBeenCalledWith({ connectionId: { value: 'c-1' } });
  });

  it('refuses one connection of a provider that this build does not know', async () => {
    const getVcsConnection = vi.fn(() =>
      unaryCall({ connection: wire({ provider: 9 as VcsProvider }) }),
    );

    await expect(repositoryWith({ getVcsConnection }).getById('c-1')).rejects.toMatchObject({
      code: 'UNSUPPORTED_RESPONSE',
    });
  });

  it('keeps the GitHub providers and the GitLab providers, with the reason of an unavailable one', async () => {
    const getVcsProviders = vi.fn(() =>
      unaryCall({
        providers: [
          {
            provider: VcsProvider.GITHUB,
            available: false,
            unavailableReason: 'APP_MISSING',
            webUrl: 'https://github.com',
          },
          {
            provider: VcsProvider.GITLAB,
            available: true,
            unavailableReason: '',
            webUrl: 'https://gitlab.com',
          },
        ],
      }),
    );

    expect(await repositoryWith({ getVcsProviders }).getProviders('ws-1')).toEqual([
      {
        provider: 'github',
        available: false,
        unavailableReason: 'APP_MISSING',
        webUrl: 'https://github.com',
      },
      { provider: 'gitlab', available: true, unavailableReason: '', webUrl: 'https://gitlab.com' },
    ]);
  });

  it('starts the install and completes it with the values of the redirect', async () => {
    const startGitHubInstall = vi.fn(() =>
      unaryCall({
        installUrl: 'https://github.com/apps/scylla/installations/new?state=s',
        expiresAt: TS,
      }),
    );
    const completeGitHubInstall = vi.fn(() => unaryCall({ connection: wire() }));
    const repository = repositoryWith({ startGitHubInstall, completeGitHubInstall });

    expect(await repository.startGitHubInstall('ws-1')).toEqual({
      installUrl: 'https://github.com/apps/scylla/installations/new?state=s',
      expiresAt: ISO,
    });
    const input = { state: 's', installationId: '42', code: 'code', setupAction: 'install' };
    const completed = await repository.completeGitHubInstall(input);
    expect(completed.kind === 'connected' && completed.connection.id).toBe('c-1');
    expect(completeGitHubInstall).toHaveBeenCalledWith(input);
  });

  it('gives the authorize page of GitHub for an install with no code, and other refusals as they are', async () => {
    const page = 'https://github.com/login/oauth/authorize?client_id=Iv1&state=s.42';
    const authorize = new ScyllaError('authorize', {
      code: 'FAILED_PRECONDITION',
      reason: 'AUTHORIZATION_REQUIRED',
      metadata: { authorize_url: page },
    });
    const response = Promise.reject(authorize);
    response.catch(() => undefined);
    const completeGitHubInstall = vi
      .fn()
      .mockReturnValueOnce({ response })
      .mockReturnValueOnce(failedCall('PERMISSION_DENIED'));
    const repository = repositoryWith({ completeGitHubInstall });
    const input = { state: 's', installationId: '42', code: '', setupAction: 'update' };

    expect(await repository.completeGitHubInstall(input)).toEqual({
      kind: 'authorize',
      authorizeUrl: page,
    });
    await expect(repository.completeGitHubInstall(input)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('sends a GitLab token once, and gives the warnings of the check', async () => {
    const connectGitLab = vi.fn(() =>
      unaryCall({
        connection: wire({ provider: VcsProvider.GITLAB }),
        warnings: ['ROLE_DEVELOPER'],
      }),
    );
    const replaceGitLabToken = vi.fn(() =>
      unaryCall({ connection: wire({ provider: VcsProvider.GITLAB }), warnings: [] }),
    );
    const repository = repositoryWith({ connectGitLab, replaceGitLabToken });

    const checked = await repository.connectGitLab({ workspaceId: 'ws-1', token: 'glpat-1' });
    await repository.replaceGitLabToken({ id: 'c-1', token: 'glpat-2' });

    expect(checked.warnings).toEqual(['ROLE_DEVELOPER']);
    expect(checked.connection.provider).toBe('gitlab');
    expect(connectGitLab).toHaveBeenCalledWith({
      workspaceId: { value: 'ws-1' },
      token: 'glpat-1',
    });
    expect(replaceGitLabToken).toHaveBeenCalledWith({
      connectionId: { value: 'c-1' },
      token: 'glpat-2',
    });
  });

  it('lists the repositories of a connection for the link of a project, one page at a time', async () => {
    const listConnectionRepositories = vi.fn(() =>
      unaryCall({
        repositories: [
          {
            externalId: '7',
            fullName: 'acme/api',
            webUrl: 'https://github.com/acme/api',
            defaultBranch: 'main',
            private: true,
            role: '',
            linkedProjectId: { value: 'p-1' },
          },
          {
            externalId: '8',
            fullName: 'acme/web',
            webUrl: 'https://github.com/acme/web',
            defaultBranch: 'main',
            private: false,
            role: '',
          },
        ],
        page: { nextToken: 'next' },
      }),
    );

    const page = await repositoryWith({ listConnectionRepositories }).listRepositories({
      projectId: 'p-2',
      connectionId: 'c-1',
      search: 'acme',
    });

    expect(listConnectionRepositories).toHaveBeenCalledWith({
      projectId: { value: 'p-2' },
      connectionId: { value: 'c-1' },
      search: 'acme',
      page: { size: 100, token: '' },
    });
    expect(page.nextPageToken).toBe('next');
    expect(page.repositories[0]).toMatchObject({ fullName: 'acme/api', linkedProjectId: 'p-1' });
    expect(page.repositories[1]).not.toHaveProperty('linkedProjectId');
  });
});
