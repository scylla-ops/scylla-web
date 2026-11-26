// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { ISecretServiceClient } from '@base/generated/scylla/projects/v1/secret_service.client.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultSecretRepository } from '../default-secret.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };

describe('DefaultSecretRepository.searchWorkspace', () => {
  it('finds the secrets of the projects of a workspace by a text, with the name of the project', async () => {
    const listWorkspaceSecrets = vi.fn(() =>
      unaryCall({
        secrets: [
          {
            secret: {
              id: { value: 'secret-9' },
              projectId: { value: 'project-2' },
              name: 'STRIPE_KEY',
              createdAt: TS,
              updatedAt: TS,
            },
            projectName: 'mobile-app',
          },
        ],
        page: { nextToken: '' },
      }),
    );
    const repository = new DefaultSecretRepository(
      { listWorkspaceSecrets } as unknown as ISecretServiceClient,
      {} as IPipelineServiceClient,
    );
    const stop = new AbortController();

    const found = await repository.searchWorkspace(
      { workspaceId: 'org-1', text: ' stripe ', limit: 8 },
      stop.signal,
    );

    expect(found).toEqual([
      {
        secret: expect.objectContaining({
          id: 'secret-9',
          projectId: 'project-2',
          name: 'STRIPE_KEY',
        }),
        projectName: 'mobile-app',
      },
    ]);
    expect(listWorkspaceSecrets).toHaveBeenCalledWith(
      { workspaceId: { value: 'org-1' }, query: 'stripe', page: { size: 8, token: '' } },
      { abort: stop.signal },
    );
  });
});
