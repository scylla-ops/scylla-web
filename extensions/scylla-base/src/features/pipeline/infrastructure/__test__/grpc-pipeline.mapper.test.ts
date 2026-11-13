// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcPipeline from '../grpc-pipeline.mapper.ts';
import {
  Shell,
  type EnvVar,
  type Node,
  type Pipeline,
} from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { PipelineSource } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type {
  EnvEntry,
  PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const execNode = (overrides: Partial<Node> = {}): Node => ({
  id: 'node-1',
  needs: [],
  workingDir: '',
  env: [],
  timeoutSeconds: 0,
  retries: 0,
  step: { oneofKind: 'exec', exec: { argv: ['echo', 'hi'] } },
  ...overrides,
});

const basePipeline = (overrides: Partial<Pipeline> = {}): Pipeline => ({
  id: { value: 'pipeline-1' },
  projectId: { value: 'project-1' },
  name: 'ci',
  nodes: [],
  version: 3n,
  createdAt: TS,
  updatedAt: TS,
  source: PipelineSource.EDITOR,
  fileKey: '',
  filePath: '',
  fileErrorCount: 0,
  ...overrides,
});

const nodeOf = (node: Node) => grpcPipeline.toDomain(basePipeline({ nodes: [node] })).nodes[0];

describe('grpcPipeline.toDomain', () => {
  it('unwraps the ids of the pipeline and carries the name through', () => {
    expect(grpcPipeline.toDomain(basePipeline())).toEqual({
      id: 'pipeline-1',
      projectId: 'project-1',
      name: 'ci',
      nodes: [],
    });
  });

  it('splits argv into the command and its arguments', () => {
    expect(nodeOf(execNode())).toEqual({
      id: 'node-1',
      deps: [],
      env: [],
      kind: 'exec',
      command: 'echo',
      args: ['hi'],
    });
  });

  it('gives an exec node with no argv an empty command', () => {
    expect(nodeOf(execNode({ step: { oneofKind: 'exec', exec: { argv: [] } } }))).toMatchObject({
      command: '',
      args: [],
    });
  });

  it('maps a script node, its shell included', () => {
    expect(
      nodeOf(
        execNode({
          step: { oneofKind: 'script', script: { source: 'make', shell: Shell.BASH } },
        }),
      ),
    ).toMatchObject({ kind: 'script', script: 'make', shell: 'bash' });
  });

  it('reads SHELL_SH and SHELL_UNSPECIFIED as "sh", as the agent does', () => {
    for (const shell of [Shell.SH, Shell.UNSPECIFIED]) {
      expect(
        nodeOf(execNode({ step: { oneofKind: 'script', script: { source: '', shell } } })),
      ).toMatchObject({ shell: 'sh' });
    }
  });

  it('throws on a step arm that this build does not know, rather than drop it', () => {
    expect(() => nodeOf(execNode({ step: { oneofKind: undefined } }))).toThrow(/update Scylla/);
  });

  it('reads the needs, the work folder, the timeout, the retries and the image', () => {
    expect(
      nodeOf(
        execNode({
          needs: ['a', 'b'],
          workingDir: 'web',
          timeoutSeconds: 60,
          retries: 2,
          container: { image: 'rust:1.97' },
        }),
      ),
    ).toMatchObject({
      deps: ['a', 'b'],
      workingDir: 'web',
      timeoutSeconds: 60,
      retries: 2,
      image: 'rust:1.97',
    });
  });

  it('leaves out the defaults of the server: no folder, no timeout, no retry, no image', () => {
    const node = nodeOf(execNode());
    for (const key of ['workingDir', 'timeoutSeconds', 'retries', 'image']) {
      expect(node).not.toHaveProperty(key);
    }
  });

  describe('env', () => {
    const withEnv = (env: EnvVar[]) => nodeOf(execNode({ env })).env;

    it('maps a literal and a secret', () => {
      expect(
        withEnv([
          { name: 'MODE', value: { oneofKind: 'literal', literal: 'release' } },
          { name: 'TOKEN', value: { oneofKind: 'secret', secret: 'API_TOKEN' } },
        ]),
      ).toEqual([
        { key: 'MODE', kind: 'literal', value: 'release' },
        { key: 'TOKEN', kind: 'secret', secretRef: 'API_TOKEN' },
      ]);
    });

    it('throws on a value arm that this build does not know', () => {
      expect(() => withEnv([{ name: 'X', value: { oneofKind: undefined } }])).toThrow(/"X"/);
    });
  });
});

describe('grpcPipeline.nodeFromDomain', () => {
  const exec: PipelineNodeEntity = {
    id: 'build',
    deps: ['checkout'],
    env: [],
    kind: 'exec',
    command: 'make',
    args: ['all'],
  };

  it('builds argv, and sends the defaults of the server for what the node leaves out', () => {
    expect(grpcPipeline.nodeFromDomain(exec)).toEqual({
      id: 'build',
      needs: ['checkout'],
      workingDir: '',
      env: [],
      timeoutSeconds: 0,
      retries: 0,
      step: { oneofKind: 'exec', exec: { argv: ['make', 'all'] } },
    });
  });

  it('sends the image in a container, and the timeout and the retries', () => {
    expect(
      grpcPipeline.nodeFromDomain({ ...exec, image: 'node:22', timeoutSeconds: 30, retries: 1 }),
    ).toMatchObject({ container: { image: 'node:22' }, timeoutSeconds: 30, retries: 1 });
  });

  it('builds a script node, "bash" as Shell.BASH and "sh" as Shell.SH', () => {
    for (const [shell, proto] of [
      ['bash', Shell.BASH],
      ['sh', Shell.SH],
    ] as const) {
      expect(
        grpcPipeline.nodeFromDomain({
          id: 's',
          deps: [],
          env: [],
          kind: 'script',
          script: 'ls',
          shell,
        }).step,
      ).toEqual({ oneofKind: 'script', script: { source: 'ls', shell: proto } });
    }
  });

  it('maps the env entries to their arms', () => {
    const env: EnvEntry[] = [
      { key: 'MODE', kind: 'literal', value: 'release' },
      { key: 'TOKEN', kind: 'secret', secretRef: 'API_TOKEN' },
    ];
    expect(grpcPipeline.nodeFromDomain({ ...exec, env }).env).toEqual([
      { name: 'MODE', value: { oneofKind: 'literal', literal: 'release' } },
      { name: 'TOKEN', value: { oneofKind: 'secret', secret: 'API_TOKEN' } },
    ]);
  });

  it('gives back the same node after a round trip', () => {
    const node = { ...exec, workingDir: 'web', image: 'node:22', retries: 2, timeoutSeconds: 9 };
    expect(nodeOf(grpcPipeline.nodeFromDomain(node))).toEqual(node);
  });
});

describe('grpcPipeline.toMetadataPage', () => {
  it('counts the nodes, formats the times and cuts the asked page', () => {
    const pipelines = ['a', 'b', 'c'].map(id =>
      basePipeline({ id: { value: id }, nodes: [execNode(), execNode({ id: 'node-2' })] }),
    );

    const page = grpcPipeline.toMetadataPage(pipelines, { page: 2, pageSize: 2 });

    expect(page.items).toEqual([
      {
        id: 'c',
        projectId: 'project-1',
        name: 'ci',
        nodeCount: 2,
        createdAt: ISO,
        updatedAt: ISO,
        origin: { source: 'editor', filePath: '', fileErrorCount: 0 },
      },
    ]);
    expect(page.pagination).toEqual({
      totalCount: 3,
      page: 2,
      pageSize: 2,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
  });
});

describe('grpcPipeline.originOf', () => {
  it('reads a file pipeline: its path, the errors of its file and the time its file left the branch', () => {
    const origin = grpcPipeline.originOf(
      basePipeline({
        source: PipelineSource.FILE,
        fileKey: 'build',
        filePath: '.scylla/pipelines/build.toml',
        fileErrorCount: 3,
        removedAt: TS,
      }),
    );

    expect(origin).toEqual({
      source: 'file',
      filePath: '.scylla/pipelines/build.toml',
      fileErrorCount: 3,
      removedAt: ISO,
    });
  });

  it('keeps the time an editor pipeline was archived', () => {
    expect(grpcPipeline.originOf(basePipeline({ archivedAt: TS }))).toEqual({
      source: 'editor',
      filePath: '',
      fileErrorCount: 0,
      archivedAt: ISO,
    });
  });

  it('reads a source newer than this build as the editor: the server stays the judge of a change', () => {
    expect(grpcPipeline.originOf(basePipeline({ source: 99 as PipelineSource })).source).toBe(
      'editor',
    );
  });
});
