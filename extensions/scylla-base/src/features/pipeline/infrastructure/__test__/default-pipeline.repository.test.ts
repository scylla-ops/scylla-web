// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { Pipeline } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultPipelineRepository } from '../default-pipeline.repository.ts';

const pipeline = (id: string, version: bigint): Pipeline => ({
  id: { value: id },
  projectId: { value: 'project-1' },
  name: id,
  nodes: [],
  version,
});

describe('DefaultPipelineRepository', () => {
  it('reads every page of a project, then cuts the asked page', async () => {
    const listProjectPipelines = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { pipelines: [pipeline('a', 1n)], page: { nextToken: 'n' } }
          : { pipelines: [pipeline('b', 1n)], page: { nextToken: '' } },
      ),
    );
    const repository = new DefaultPipelineRepository({
      listProjectPipelines,
    } as unknown as IPipelineServiceClient);

    const list = await repository.getMetadataByProjectId('project-1', { page: 2, pageSize: 1 });

    expect(listProjectPipelines).toHaveBeenCalledTimes(2);
    expect(list.items.map(item => item.id)).toEqual(['b']);
  });

  it('sends back the version that it read, and keeps the new one', async () => {
    const updatePipeline = vi.fn((input: { version: bigint }) =>
      unaryCall({ pipeline: pipeline('p', input.version + 1n) }),
    );
    const client = {
      getPipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 4n) })),
      updatePipeline,
    } as unknown as IPipelineServiceClient;
    const repository = new DefaultPipelineRepository(client);

    await repository.getById('p');
    await repository.edit('p', [], 'renamed');
    await repository.edit('p', []);

    expect(updatePipeline).toHaveBeenNthCalledWith(1, {
      pipelineId: { value: 'p' },
      version: 4n,
      nodes: { nodes: [] },
      name: 'renamed',
    });
    expect(updatePipeline.mock.calls[1][0]).toMatchObject({ version: 5n });
    expect(updatePipeline.mock.calls[1][0]).not.toHaveProperty('name');
  });

  it('reads a pipeline that it never read before it edits it', async () => {
    const client = {
      getPipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 7n) })),
      updatePipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 8n) })),
    } as unknown as IPipelineServiceClient;

    await new DefaultPipelineRepository(client).edit('p', []);

    expect(client.getPipeline).toHaveBeenCalledOnce();
    expect(client.updatePipeline).toHaveBeenCalledWith(expect.objectContaining({ version: 7n }));
  });
});
