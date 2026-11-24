// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  PipelineFileFormat,
  type PipelineFile,
} from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import { PullRequestEvent } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import * as grpcPipelineFile from '../grpc-pipeline-file.mapper.ts';

const file = (overrides: Partial<PipelineFile> = {}): PipelineFile => ({
  key: 'build',
  file: {
    path: '.scylla/pipelines/build.yml',
    blobSha: 'blob',
    commitSha: 'a1b2c3d4e5',
    url: 'https://gitlab.com/acme/api/-/blob/a1b2c3d4e5/.scylla/pipelines/build.yml',
  },
  format: PipelineFileFormat.YAML,
  content: 'version: 1\n',
  name: 'Build',
  nodes: [
    {
      id: 'test',
      needs: [],
      workingDir: '',
      env: [],
      timeoutSeconds: 0,
      retries: 0,
      step: { oneofKind: 'exec', exec: { argv: ['cargo', 'test'] } },
    },
  ],
  errors: [],
  ...overrides,
});

describe('grpcPipelineFile.fileToDomain', () => {
  it('reads the place of the file, its format, its nodes and its name', () => {
    expect(grpcPipelineFile.fileToDomain(file())).toMatchObject({
      key: 'build',
      path: '.scylla/pipelines/build.yml',
      commitSha: 'a1b2c3d4e5',
      url: 'https://gitlab.com/acme/api/-/blob/a1b2c3d4e5/.scylla/pipelines/build.yml',
      format: 'yaml',
      content: 'version: 1\n',
      name: 'Build',
      nodes: [{ id: 'test', command: 'cargo', args: ['test'] }],
      rules: {},
      errors: [],
    });
  });

  it('names the pipeline after its key when the file has no name', () => {
    expect(grpcPipelineFile.fileToDomain(file({ name: '' })).name).toBe('build');
  });

  it('leaves out a format this build does not know', () => {
    expect(
      grpcPipelineFile.fileToDomain(file({ format: 42 as PipelineFileFormat })).format,
    ).toBeUndefined();
  });

  it('reads the rules of on, and leaves out a pull request event this build does not know', () => {
    const rules = grpcPipelineFile.fileToDomain(
      file({
        push: { branches: ['main', 'release/*'], excludeBranches: ['wip/*'], skipCi: true },
        pullRequest: {
          branches: ['main'],
          events: [PullRequestEvent.OPENED, PullRequestEvent.SYNCHRONIZED, 99 as PullRequestEvent],
          drafts: false,
        },
        tag: { patterns: ['v*'] },
      }),
    ).rules;

    expect(rules).toEqual({
      push: { branches: ['main', 'release/*'], excludeBranches: ['wip/*'], skipCi: true },
      pullRequest: { branches: ['main'], events: ['opened', 'new_commits'], drafts: false },
      tag: { patterns: ['v*'] },
    });
  });

  it('keeps the checkout settings of the file, and none when the file has none', () => {
    const checkout = { enabled: true, depth: 0, submodules: true, lfs: false };

    expect(grpcPipelineFile.fileToDomain(file({ checkout })).checkout).toEqual(checkout);
    expect(grpcPipelineFile.fileToDomain(file()).checkout).toBeUndefined();
  });

  it('keeps the errors and the warnings with their place', () => {
    const errors = grpcPipelineFile.fileToDomain(
      file({
        nodes: [],
        errors: [
          {
            path: '.scylla/pipelines/build.yml',
            line: 8,
            column: 5,
            field: 'nodes[0]',
            message: 'unknown key "timeout"',
            warning: false,
          },
          {
            path: '.scylla/pipelines/build.yml',
            line: 3,
            column: 0,
            field: '',
            message: 'secret "TOKEN" is missing',
            warning: true,
          },
        ],
      }),
    ).errors;

    expect(errors).toEqual([
      {
        path: '.scylla/pipelines/build.yml',
        line: 8,
        column: 5,
        field: 'nodes[0]',
        message: 'unknown key "timeout"',
        warning: false,
      },
      {
        path: '.scylla/pipelines/build.yml',
        line: 3,
        column: 0,
        field: '',
        message: 'secret "TOKEN" is missing',
        warning: true,
      },
    ]);
  });
});

describe('grpcPipelineFile.refToProto', () => {
  it('sends the kind of the ref in its oneof arm', () => {
    expect(grpcPipelineFile.refToProto({ kind: 'branch', name: 'main' })).toEqual({
      kind: { oneofKind: 'branch', branch: 'main' },
    });
    expect(grpcPipelineFile.refToProto({ kind: 'tag', name: 'v1' })).toEqual({
      kind: { oneofKind: 'tag', tag: 'v1' },
    });
    expect(grpcPipelineFile.refToProto({ kind: 'sha', sha: ' abc1234 ' })).toEqual({
      kind: { oneofKind: 'sha', sha: 'abc1234' },
    });
  });
});
