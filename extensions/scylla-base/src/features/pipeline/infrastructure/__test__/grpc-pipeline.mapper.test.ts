// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcPipeline from '../grpc-pipeline.mapper.ts';
import {
  Combinator,
  Shell,
  Test,
  type EnvVar,
  type Node,
  type Pipeline,
} from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import type {
  EnvEntry,
  ExecPipelineNodeEntity,
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
          needs: [
            { node: 'a', port: '' },
            { node: 'b', port: 'error' },
          ],
          workingDir: 'web',
          timeoutSeconds: 60,
          retries: 2,
          container: { image: 'rust:1.97' },
        }),
      ),
    ).toMatchObject({
      deps: [{ node: 'a' }, { node: 'b', port: 'error' }],
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
    const withEnv = (env: EnvVar[]) => (nodeOf(execNode({ env })) as ExecPipelineNodeEntity).env;

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
    deps: [{ node: 'checkout' }],
    env: [],
    kind: 'exec',
    command: 'make',
    args: ['all'],
  };

  it('builds argv, and sends the defaults of the server for what the node leaves out', () => {
    expect(grpcPipeline.nodeFromDomain(exec)).toEqual({
      id: 'build',
      needs: [{ node: 'checkout', port: '' }],
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

describe('the switch and the merge', () => {
  const ifNode: PipelineNodeEntity = {
    id: 'is-main',
    deps: [{ node: 'build' }],
    env: [{ key: 'TARGET', kind: 'literal', value: 'main' }],
    kind: 'switch',
    cases: [
      {
        port: 'true',
        combinator: 'any',
        rules: [
          {
            left: { kind: 'var', name: 'SCYLLA_BRANCH' },
            test: 'equals',
            right: { kind: 'var', name: 'TARGET' },
          },
          {
            left: { kind: 'output', node: 'build', key: 'COUNT' },
            test: 'number_gt',
            right: { kind: 'literal', value: '2' },
          },
          { left: { kind: 'literal', value: '' }, test: 'not_empty' },
        ],
      },
    ],
    otherwise: 'false',
    allMatches: true,
  };

  it('sends a switch with its cases, its rules and its ports, and no step field', () => {
    expect(grpcPipeline.nodeFromDomain(ifNode)).toEqual({
      id: 'is-main',
      needs: [{ node: 'build', port: '' }],
      workingDir: '',
      env: [{ name: 'TARGET', value: { oneofKind: 'literal', literal: 'main' } }],
      timeoutSeconds: 0,
      retries: 0,
      step: {
        oneofKind: 'switch',
        switch: {
          cases: [
            {
              port: 'true',
              combinator: Combinator.ANY,
              rules: [
                {
                  left: { value: { oneofKind: 'var', var: 'SCYLLA_BRANCH' } },
                  test: Test.EQUALS,
                  right: { value: { oneofKind: 'var', var: 'TARGET' } },
                },
                {
                  left: { value: { oneofKind: 'output', output: { node: 'build', key: 'COUNT' } } },
                  test: Test.NUMBER_GT,
                  right: { value: { oneofKind: 'literal', literal: '2' } },
                },
                { left: { value: { oneofKind: 'literal', literal: '' } }, test: Test.NOT_EMPTY },
              ],
            },
          ],
          otherwise: 'false',
          allMatches: true,
        },
      },
    });
  });

  it('gives back the same switch and the same merge after a round trip', () => {
    const merge: PipelineNodeEntity = {
      id: 'join',
      deps: [
        { node: 'is-main', port: 'true' },
        { node: 'test', port: 'error' },
      ],
      kind: 'merge',
    };
    expect(nodeOf(grpcPipeline.nodeFromDomain(ifNode))).toEqual(ifNode);
    expect(nodeOf(grpcPipeline.nodeFromDomain(merge))).toEqual(merge);
    expect(
      nodeOf(grpcPipeline.nodeFromDomain({ ...ifNode, otherwise: undefined })),
    ).not.toHaveProperty('otherwise');
  });

  it('reads COMBINATOR_UNSPECIFIED as all, as the server does', () => {
    const proto = grpcPipeline.nodeFromDomain(ifNode);
    if (proto.step.oneofKind !== 'switch') throw new Error('not a switch');
    proto.step.switch.cases[0].combinator = Combinator.UNSPECIFIED;
    expect(nodeOf(proto)).toMatchObject({ cases: [{ combinator: 'all' }] });
  });

  it('throws on a test or an operand that this build does not know, rather than drop it', () => {
    const withRule = (rule: object) =>
      execNode({
        step: {
          oneofKind: 'switch',
          switch: {
            cases: [{ port: 'true', combinator: Combinator.ALL, rules: [rule as never] }],
            otherwise: '',
            allMatches: false,
          },
        },
      });
    const left = { value: { oneofKind: 'literal', literal: 'a' } };
    expect(() => nodeOf(withRule({ left, test: 99 }))).toThrow(/update Scylla/);
    expect(() => nodeOf(withRule({ left, test: Test.UNSPECIFIED }))).toThrow(/update Scylla/);
    expect(() =>
      nodeOf(withRule({ left: { value: { oneofKind: undefined } }, test: Test.EMPTY })),
    ).toThrow(/update Scylla/);
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
