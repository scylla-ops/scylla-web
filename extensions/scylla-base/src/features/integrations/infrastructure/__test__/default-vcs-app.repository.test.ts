// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { VcsProvider } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { IVcsAppServiceClient } from '@base/generated/scylla/platform/v1/vcs_app_service.client.ts';
import type { VcsApp } from '@base/generated/scylla/platform/v1/vcs_app_service.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultVcsAppRepository } from '../default-vcs-app.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };

const wire = (patch: Partial<VcsApp> = {}): VcsApp => ({
  id: { value: 'app-1' },
  provider: VcsProvider.GITHUB,
  appId: '77',
  slug: 'scylla-acme',
  name: 'Scylla acme',
  owner: 'acme',
  webUrl: 'https://github.com/apps/scylla-acme',
  webhookUrl: 'https://ci.acme.dev/integrations/github/app-1/webhook',
  lastDeliveryAt: TS,
  lastDeliveryStatus: 202,
  managedBySettings: false,
  createdBy: { value: 'u-1' },
  createdAt: TS,
  ...patch,
});

const repositoryOf = (client: Partial<Record<keyof IVcsAppServiceClient, unknown>>) =>
  new DefaultVcsAppRepository(client as unknown as IVcsAppServiceClient);

describe('DefaultVcsAppRepository', () => {
  it('maps the App of the instance, and no App to null', async () => {
    const getVcsApp = vi
      .fn()
      .mockReturnValueOnce(unaryCall({ app: wire() }))
      .mockReturnValueOnce(unaryCall({}));
    const repository = repositoryOf({ getVcsApp });

    const app = await repository.get();
    const none = await repository.get();

    expect(app).toEqual({
      id: 'app-1',
      provider: 'github',
      appId: '77',
      slug: 'scylla-acme',
      name: 'Scylla acme',
      owner: 'acme',
      webUrl: 'https://github.com/apps/scylla-acme',
      webhookUrl: 'https://ci.acme.dev/integrations/github/app-1/webhook',
      lastDeliveryAt: '2025-01-01T00:00:00.000Z',
      lastDeliveryStatus: 202,
      managedBySettings: false,
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    expect(none).toBeNull();
  });

  it('maps an App of the settings with no id and no time', async () => {
    const managed = wire({
      id: undefined,
      lastDeliveryAt: undefined,
      lastDeliveryStatus: 0,
      managedBySettings: true,
      createdBy: undefined,
      createdAt: undefined,
    });
    const repository = repositoryOf({ getVcsApp: vi.fn(() => unaryCall({ app: managed })) });

    const app = await repository.get();

    expect(app).toMatchObject({ id: '', managedBySettings: true, lastDeliveryStatus: 0 });
    expect(app?.lastDeliveryAt).toBeUndefined();
    expect(app?.createdAt).toBeUndefined();
  });

  it('sends the organization with no spaces, and gives the page and the manifest', async () => {
    const startGitHubManifest = vi.fn(() =>
      unaryCall({
        postUrl: 'https://github.com/organizations/acme/settings/apps/new?state=s-1',
        manifest: '{"name":"Scylla"}',
        expiresAt: TS,
      }),
    );
    const repository = repositoryOf({ startGitHubManifest });

    const started = await repository.startGitHubManifest(' acme ');

    expect(startGitHubManifest).toHaveBeenCalledWith({ organization: 'acme' });
    expect(started).toEqual({
      postUrl: 'https://github.com/organizations/acme/settings/apps/new?state=s-1',
      manifest: '{"name":"Scylla"}',
      expiresAt: '2025-01-01T00:00:00.000Z',
    });
  });

  it('sends the code and the state, and refuses an answer with no App', async () => {
    const completeGitHubManifest = vi
      .fn()
      .mockReturnValueOnce(unaryCall({ app: wire() }))
      .mockReturnValueOnce(unaryCall({}));
    const repository = repositoryOf({ completeGitHubManifest });

    const app = await repository.completeGitHubManifest({ code: 'c0de', state: 's-1' });

    expect(completeGitHubManifest).toHaveBeenCalledWith({ code: 'c0de', state: 's-1' });
    expect(app.id).toBe('app-1');
    await expect(
      repository.completeGitHubManifest({ code: 'c0de', state: 's-1' }),
    ).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });

  it('removes the App', async () => {
    const deleteVcsApp = vi.fn(() => unaryCall({}));

    await repositoryOf({ deleteVcsApp }).remove();

    expect(deleteVcsApp).toHaveBeenCalledWith({});
  });
});
