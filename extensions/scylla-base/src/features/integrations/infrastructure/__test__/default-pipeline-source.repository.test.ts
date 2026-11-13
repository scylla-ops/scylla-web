// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PipelineSource } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { PipelineFile } from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import { PipelineFileFormat } from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import type { IPipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultPipelineSourceRepository } from '../default-pipeline-source.repository.ts';

const error = {
  path: '',
  line: 0,
  column: 0,
  field: '',
  message: 'two definitions',
  warning: false,
};

const wire = (patch: Partial<PipelineFile> = {}): PipelineFile => ({
  key: 'build',
  file: {
    path: '.scylla/pipelines/build.toml',
    blobSha: 'b1',
    commitSha: 'a1b2c3d',
    url: 'https://github.com/acme/api/blob/a1b2c3d/.scylla/pipelines/build.toml',
  },
  format: PipelineFileFormat.TOML,
  content: '',
  name: 'build',
  nodes: [],
  errors: [],
  ...patch,
});

describe('DefaultPipelineSourceRepository', () => {
  it('maps the files of the default branch: their errors and the sections of on', async () => {
    const listPipelineFiles = vi.fn(() =>
      unaryCall({
        files: [
          wire({
            push: { branches: ['main'], excludeBranches: [], skipCi: true },
            tag: { patterns: ['v*'] },
          }),
          wire({
            key: 'nightly',
            file: undefined,
            errors: [
              { ...error, path: 'n.yml', line: 3, column: 1, message: 'bad', warning: true },
            ],
          }),
        ],
        errors: [error],
        commitSha: 'a1b2c3d',
      }),
    );
    const repository = new DefaultPipelineSourceRepository({
      listPipelineFiles,
    } as unknown as IPipelineServiceClient);

    const found = await repository.listFiles('p-1');

    expect(listPipelineFiles).toHaveBeenCalledWith({ projectId: { value: 'p-1' } });
    expect(found.commitSha).toBe('a1b2c3d');
    expect(found.files[0]).toEqual({
      key: 'build',
      path: '.scylla/pipelines/build.toml',
      url: 'https://github.com/acme/api/blob/a1b2c3d/.scylla/pipelines/build.toml',
      issues: [],
      triggers: ['push', 'tag'],
    });
    expect(found.files[1]).toMatchObject({
      path: '',
      url: '',
      triggers: [],
      issues: [{ path: 'n.yml', line: 3, column: 1, message: 'bad', warning: true }],
    });
    expect(found.issues).toEqual([
      { path: '', line: 0, column: 0, message: 'two definitions', warning: false },
    ]);
  });

  it('sends the new source of the project', async () => {
    const setPipelineSource = vi.fn(() => unaryCall({}));
    const repository = new DefaultPipelineSourceRepository({
      setPipelineSource,
    } as unknown as IPipelineServiceClient);

    await repository.setSource({ projectId: 'p-1', source: 'file' });
    await repository.setSource({ projectId: 'p-1', source: 'editor' });

    expect(setPipelineSource).toHaveBeenNthCalledWith(1, {
      projectId: { value: 'p-1' },
      source: PipelineSource.FILE,
    });
    expect(setPipelineSource).toHaveBeenNthCalledWith(2, {
      projectId: { value: 'p-1' },
      source: PipelineSource.EDITOR,
    });
  });
});
