// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IRepositoryServiceClient } from '@base/generated/scylla/integrations/v1/repository_service.client.ts';
import {
  ConnectionState,
  DeliveryMode,
  GitRefKind,
  PipelineSource,
  VcsProvider,
  type RepositoryLink,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultRepositoryLinkRepository } from '../default-repository-link.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const wire = (patch: Partial<RepositoryLink> = {}): RepositoryLink => ({
  projectId: { value: 'p-1' },
  workspaceId: { value: 'ws-1' },
  connectionId: { value: 'c-1' },
  provider: VcsProvider.GITHUB,
  account: 'acme',
  externalId: '7',
  fullName: 'acme/api',
  webUrl: 'https://github.com/acme/api',
  defaultBranch: 'main',
  private: true,
  pipelineSource: PipelineSource.EDITOR,
  reportsEnabled: true,
  deliveryMode: DeliveryMode.WEBHOOK,
  pollIntervalSeconds: 120,
  lastEventAt: TS,
  state: ConnectionState.ACTIVE,
  stateReason: '',
  createdBy: { value: 'u-1' },
  createdAt: TS,
  ...patch,
});

/** A fake client with only the calls of the test: `unaryCall` answers with a partial type. */
const repositoryWith = (client: object) =>
  new DefaultRepositoryLinkRepository(client as IRepositoryServiceClient);

describe('DefaultRepositoryLinkRepository', () => {
  it('gives null for a project with no link, and the link of a linked project', async () => {
    const getRepositoryLink = vi
      .fn()
      .mockReturnValueOnce(unaryCall({}))
      .mockReturnValueOnce(unaryCall({ link: wire() }));
    const repository = repositoryWith({ getRepositoryLink });

    expect(await repository.getByProject('p-9')).toBeNull();
    expect(await repository.getByProject('p-1')).toEqual({
      projectId: 'p-1',
      workspaceId: 'ws-1',
      connectionId: 'c-1',
      provider: 'github',
      account: 'acme',
      externalId: '7',
      fullName: 'acme/api',
      webUrl: 'https://github.com/acme/api',
      defaultBranch: 'main',
      private: true,
      pipelineSource: 'editor',
      reportsEnabled: true,
      deliveryMode: 'webhook',
      pollIntervalSeconds: 120,
      lastEventAt: ISO,
      state: 'active',
      stateReason: '',
      createdBy: 'u-1',
      createdAt: ISO,
    });
  });

  it('sends only the fields of an update that change', async () => {
    const updateRepositoryLink = vi.fn(() =>
      unaryCall({ link: wire({ reportsEnabled: false }) }),
    );
    const repository = repositoryWith({ updateRepositoryLink });

    const link = await repository.update({ projectId: 'p-1', reportsEnabled: false });
    await repository.update({ projectId: 'p-1', pollIntervalSeconds: 300 });

    expect(link.reportsEnabled).toBe(false);
    expect(updateRepositoryLink).toHaveBeenNthCalledWith(1, {
      projectId: { value: 'p-1' },
      reportsEnabled: false,
      pollIntervalSeconds: undefined,
    });
    expect(updateRepositoryLink).toHaveBeenNthCalledWith(2, {
      projectId: { value: 'p-1' },
      reportsEnabled: undefined,
      pollIntervalSeconds: 300,
    });
  });

  it('links, tests the delivery and unlinks a repository', async () => {
    const linkRepository = vi.fn(() => unaryCall({ link: wire() }));
    const testDelivery = vi.fn(() =>
      unaryCall({
        delivered: false,
        error: 'timeout',
        link: wire({ deliveryMode: DeliveryMode.POLLING }),
      }),
    );
    const unlinkRepository = vi.fn(() => unaryCall({}));
    const repository = repositoryWith({ linkRepository, testDelivery, unlinkRepository });

    await repository.link({ projectId: 'p-1', connectionId: 'c-1', externalId: '7' });
    const test = await repository.testDelivery('p-1');
    await repository.unlink('p-1');

    expect(linkRepository).toHaveBeenCalledWith({
      projectId: { value: 'p-1' },
      connectionId: { value: 'c-1' },
      externalId: '7',
    });
    expect(test).toMatchObject({ delivered: false, error: 'timeout' });
    expect(test.link.deliveryMode).toBe('polling');
    expect(unlinkRepository).toHaveBeenCalledWith({ projectId: { value: 'p-1' } });
  });

  it('lists the refs of a kind, and drops a kind that this build does not know', async () => {
    const listRefs = vi.fn(() =>
      unaryCall({
        refs: [
          {
            name: 'main',
            kind: GitRefKind.BRANCH,
            sha: 'a'.repeat(40),
            defaultBranch: true,
            webUrl: 'u1',
          },
          {
            name: 'v1.0.0',
            kind: GitRefKind.TAG,
            sha: 'b'.repeat(40),
            defaultBranch: false,
            webUrl: 'u2',
          },
          {
            name: 'odd',
            kind: 9 as GitRefKind,
            sha: 'c'.repeat(40),
            defaultBranch: false,
            webUrl: 'u3',
          },
        ],
        page: { nextToken: '' },
      }),
    );

    const page = await repositoryWith({ listRefs }).listRefs({ projectId: 'p-1', kind: 'branch' });

    expect(listRefs).toHaveBeenCalledWith({
      projectId: { value: 'p-1' },
      kind: GitRefKind.BRANCH,
      search: '',
      page: { size: 100, token: '' },
    });
    expect(page.refs.map(ref => [ref.name, ref.kind])).toEqual([
      ['main', 'branch'],
      ['v1.0.0', 'tag'],
    ]);
  });
});
