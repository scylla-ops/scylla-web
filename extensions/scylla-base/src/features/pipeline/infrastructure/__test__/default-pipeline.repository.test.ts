// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import type { Pipeline } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { PipelineSource } from '@base/generated/scylla/integrations/v1/vcs.ts';
import { PipelineFileFormat } from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultPipelineRepository } from '../default-pipeline.repository.ts';

const pipeline = (id: string, version: bigint): Pipeline => ({
  id: { value: id },
  projectId: { value: 'project-1' },
  name: id,
  nodes: [],
  version,
  source: PipelineSource.EDITOR,
  fileKey: '',
  filePath: '',
  fileErrorCount: 0,
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

  it('gives the saved places beside the pipeline, and no layout when nothing is saved', async () => {
    const start = { x: 1, y: 2 };
    const nodes = { build: { x: 3, y: -4 } };
    const getPipeline = vi
      .fn()
      .mockReturnValueOnce(unaryCall({ pipeline: pipeline('p', 1n), layout: { start, nodes } }))
      .mockReturnValueOnce(unaryCall({ pipeline: pipeline('p', 1n) }));
    const repository = new DefaultPipelineRepository({
      getPipeline,
    } as unknown as IPipelineServiceClient);

    expect((await repository.getWithLayout('p')).layout).toEqual({ start, nodes });
    expect((await repository.getWithLayout('p')).layout).toBeNull();
  });

  it('keeps the version of a read with its layout, for the next edit', async () => {
    const client = {
      getPipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 4n) })),
      updatePipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 5n) })),
    } as unknown as IPipelineServiceClient;
    const repository = new DefaultPipelineRepository(client);

    await repository.getWithLayout('p');
    await repository.edit('p', []);

    expect(client.getPipeline).toHaveBeenCalledOnce();
    expect(client.updatePipeline).toHaveBeenCalledWith(expect.objectContaining({ version: 4n }));
  });

  it('saves only the places that it gets', async () => {
    const savePipelineLayout = vi.fn(() => unaryCall({}));
    const repository = new DefaultPipelineRepository({
      savePipelineLayout,
    } as unknown as IPipelineServiceClient);

    await repository.saveLayout('p', { nodes: { build: { x: 3, y: 4 } } });

    expect(savePipelineLayout).toHaveBeenCalledWith({
      pipelineId: { value: 'p' },
      layout: { nodes: { build: { x: 3, y: 4 } } },
    });
  });

  it('sends the places of new nodes with the create and with the edit', async () => {
    const layout = { start: { x: 0, y: 0 }, nodes: { lint: { x: 5, y: 6 } } };
    const client = {
      getPipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 1n) })),
      createPipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 1n) })),
      updatePipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 2n) })),
    } as unknown as IPipelineServiceClient;
    const repository = new DefaultPipelineRepository(client);

    await repository.create({ projectId: 'project-1', name: 'p', nodes: [] }, layout);
    await repository.edit('p', [], 'p', { nodes: layout.nodes });

    expect(client.createPipeline).toHaveBeenCalledWith(expect.objectContaining({ layout }));
    expect(client.updatePipeline).toHaveBeenCalledWith(
      expect.objectContaining({ layout: { nodes: layout.nodes } }),
    );
  });

  it('sends no layout field with no places', async () => {
    const client = {
      createPipeline: vi.fn(() => unaryCall({ pipeline: pipeline('p', 1n) })),
    } as unknown as IPipelineServiceClient;

    await new DefaultPipelineRepository(client).create({
      projectId: 'project-1',
      name: 'p',
      nodes: [],
    });

    expect(vi.mocked(client.createPipeline).mock.calls[0]?.[0]).not.toHaveProperty('layout');
  });

  it('exports a pipeline in the format of the proto, and gives the file and its path', async () => {
    const exportPipeline = vi.fn(() =>
      unaryCall({ content: 'version: 1\n', path: '.scylla/pipelines/ci.yaml' }),
    );
    const repository = new DefaultPipelineRepository({
      exportPipeline,
    } as unknown as IPipelineServiceClient);

    const file = await repository.exportFile('p', 'yaml');

    expect(exportPipeline).toHaveBeenCalledWith({
      pipelineId: { value: 'p' },
      format: PipelineFileFormat.YAML,
    });
    expect(file).toEqual({ content: 'version: 1\n', path: '.scylla/pipelines/ci.yaml' });
  });

  it('runs with no ref when none is given: the server picks the commit', async () => {
    const runPipeline = vi.fn(() => unaryCall({ job: { nodes: [] } }));
    const repository = new DefaultPipelineRepository({
      runPipeline,
    } as unknown as IPipelineServiceClient);

    await repository.run('p');

    expect(runPipeline).toHaveBeenCalledWith({ pipelineId: { value: 'p' } });
  });

  it('runs at a branch, a tag or a trimmed SHA', async () => {
    const runPipeline = vi.fn((_request: { ref?: unknown }) => unaryCall({ job: { nodes: [] } }));
    const repository = new DefaultPipelineRepository({
      runPipeline,
    } as unknown as IPipelineServiceClient);

    await repository.run('p', { kind: 'branch', name: 'main' });
    await repository.run('p', { kind: 'tag', name: 'v1.2.0' });
    await repository.run('p', { kind: 'sha', sha: ' a1b2c3d ' });

    expect(runPipeline.mock.calls.map(([request]) => request.ref)).toEqual([
      { kind: { oneofKind: 'branch', branch: 'main' } },
      { kind: { oneofKind: 'tag', tag: 'v1.2.0' } },
      { kind: { oneofKind: 'sha', sha: 'a1b2c3d' } },
    ]);
  });

  it('reads the file of a file pipeline at a ref, with its nodes and its errors', async () => {
    const getFilePipeline = vi.fn(() =>
      unaryCall({
        file: {
          key: 'build',
          file: {
            path: '.scylla/pipelines/build.toml',
            blobSha: 'b',
            commitSha: 'a1b2c3d4',
            url: 'https://github.com/acme/api/blob/a1b2c3d4/.scylla/pipelines/build.toml',
          },
          format: PipelineFileFormat.TOML,
          content: 'version = 1\n',
          name: '',
          nodes: [],
          errors: [
            { path: '.scylla/pipelines/build.toml', line: 12, column: 5, field: '', message: 'expected "="', warning: false },
          ],
        },
      }),
    );
    const repository = new DefaultPipelineRepository({
      getFilePipeline,
    } as unknown as IPipelineServiceClient);

    const file = await repository.getFile('p', { kind: 'branch', name: 'main' });

    expect(getFilePipeline).toHaveBeenCalledWith({
      pipelineId: { value: 'p' },
      ref: { kind: { oneofKind: 'branch', branch: 'main' } },
    });
    expect(file).toMatchObject({
      key: 'build',
      name: 'build',
      path: '.scylla/pipelines/build.toml',
      commitSha: 'a1b2c3d4',
      format: 'toml',
      rules: {},
      errors: [{ line: 12, column: 5, message: 'expected "="', warning: false }],
    });
    expect(file.checkout).toBeUndefined();
  });

  it('gives the origin of a pipeline beside its layout', async () => {
    const client = {
      getPipeline: vi.fn(() =>
        unaryCall({
          pipeline: {
            ...pipeline('p', 1n),
            source: PipelineSource.FILE,
            filePath: '.scylla/pipeline.toml',
            fileErrorCount: 2,
          },
        }),
      ),
    } as unknown as IPipelineServiceClient;

    const { origin } = await new DefaultPipelineRepository(client).getWithLayout('p');

    expect(origin).toEqual({
      source: 'file',
      filePath: '.scylla/pipeline.toml',
      fileErrorCount: 2,
    });
  });
});
