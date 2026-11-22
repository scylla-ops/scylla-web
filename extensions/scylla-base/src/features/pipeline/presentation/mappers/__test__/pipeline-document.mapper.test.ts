// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  pipelineIssue,
  type PipelineEntity,
} from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import {
  nameOf,
  parseScript,
  nodesOf,
  withName,
  withNodes,
  toDocument,
} from '../pipeline-document.mapper.ts';
import type {
  ExecPipelineNodeEntity,
  PipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const documentOf = (value: unknown) => parseScript(JSON.stringify(value)).document;
/** The nodes of a document of commands. */
const stepNodesOf = (document: Record<string, unknown> | null) =>
  nodesOf(document) as ExecPipelineNodeEntity[];

describe('parseScript', () => {
  it('an empty editor is not an error, just nothing to work with', () => {
    expect(parseScript('   ')).toEqual({ document: null, error: null });
  });

  it('reports malformed JSON without throwing', () => {
    const parsed = parseScript('{not json');
    expect(parsed.document).toBeNull();
    expect(parsed.error).not.toBeNull();
  });

  it('parses a well-formed document', () => {
    expect(parseScript('{"name":"my-ci"}').document).toEqual({ name: 'my-ci' });
  });
});

describe('nameOf', () => {
  it('falls back to "my-pipeline" for a document that names nothing', () => {
    expect(nameOf(null)).toBe('my-pipeline');
    expect(nameOf({})).toBe('my-pipeline');
  });

  it('reads the name the document carries', () => {
    expect(nameOf({ name: 'my-ci' })).toBe('my-ci');
  });
});

describe('nodesOf', () => {
  it('reads a fully specified node', () => {
    const nodes = nodesOf(
      documentOf({
        nodes: [{ id: 'build', deps: [], kind: 'exec', command: 'make', args: ['build'] }],
      }),
    );

    expect(nodes).toEqual([
      {
        id: 'build',
        deps: [],
        workingDir: undefined,
        env: [],
        kind: 'exec',
        command: 'make',
        args: ['build'],
      },
    ]);
  });

  describe('node kind inference (no explicit "kind")', () => {
    it('a node with a "command" field is treated as exec', () => {
      const [node] = nodesOf(documentOf({ nodes: [{ id: 'a', command: 'echo hi' }] }));
      expect(node).toMatchObject({ kind: 'exec', command: 'echo hi' });
    });

    it('a node with a "script" field is treated as script', () => {
      const [node] = nodesOf(documentOf({ nodes: [{ id: 'a', script: 'echo hi' }] }));
      expect(node).toMatchObject({ kind: 'script', script: 'echo hi', shell: 'sh' });
    });

    it('a node with neither field defaults to an empty exec command', () => {
      const [node] = nodesOf(documentOf({ nodes: [{ id: 'a' }] }));
      expect(node).toMatchObject({ kind: 'exec', command: '', args: [] });
    });

    it('an explicit shell other than "bash" falls back to "sh"', () => {
      const [node] = nodesOf(
        documentOf({ nodes: [{ id: 'a', kind: 'script', script: 's', shell: 'zsh' }] }),
      );
      expect(node).toMatchObject({ shell: 'sh' });
    });
  });

  describe('ids and dependencies that are not strings', () => {
    it('reads a non-string id as empty, so that the node is refused instead of crashing', () => {
      expect(nodesOf(documentOf({ nodes: [{ id: 7, deps: [] }] }))[0].id).toBe('');
    });

    it('keeps only the string dependencies, and none for a non-array', () => {
      const [node, other] = nodesOf(
        documentOf({
          nodes: [
            { id: 'a', deps: ['x', 1, null] },
            { id: 'b', deps: 'x' },
          ],
        }),
      );

      expect(node.deps).toEqual([{ node: 'x' }]);
      expect(other.deps).toEqual([]);
    });
  });

  describe('timeout and retries', () => {
    it('reads the timeout and the retries, and ignores a value that is not a number', () => {
      const [node, other] = stepNodesOf(
        documentOf({
          nodes: [
            { id: 'a', command: 'x', timeoutSeconds: 60, retries: 3 },
            { id: 'b', command: 'x', timeoutSeconds: '60', retries: null },
          ],
        }),
      );
      expect(node).toMatchObject({ timeoutSeconds: 60, retries: 3 });
      expect(other.timeoutSeconds).toBeUndefined();
      expect(other.retries).toBeUndefined();
    });

    it.each([1.5, -1, 2 ** 32, Number.NaN])(
      'ignores %s, which the wire cannot carry as a count',
      value => {
        const [node] = stepNodesOf(
          documentOf({ nodes: [{ id: 'a', command: 'x', timeoutSeconds: value, retries: value }] }),
        );
        expect(node.timeoutSeconds).toBeUndefined();
        expect(node.retries).toBeUndefined();
      },
    );
  });

  describe('env parsing', () => {
    it('tolerates a literal entry missing its value', () => {
      const [node] = stepNodesOf(
        documentOf({ nodes: [{ id: 'a', command: 'x', env: [{ key: 'K' }] }] }),
      );
      expect(node.env).toEqual([{ key: 'K', kind: 'literal', value: '' }]);
    });

    it('tolerates a secret entry missing its secretRef', () => {
      const [node] = stepNodesOf(
        documentOf({ nodes: [{ id: 'a', command: 'x', env: [{ key: 'K', kind: 'secret' }] }] }),
      );
      expect(node.env).toEqual([{ key: 'K', kind: 'secret', secretRef: '' }]);
    });

    it('a non-array env is treated as empty rather than throwing', () => {
      const [node] = stepNodesOf(documentOf({ nodes: [{ id: 'a', command: 'x', env: 'nope' }] }));
      expect(node.env).toEqual([]);
    });
  });
});

describe('withNodes', () => {
  it('seeds a fresh {name, projectId} document when nothing was parsed yet', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 'build', deps: [], env: [], kind: 'exec', command: 'make', args: [] },
    ];

    expect(JSON.parse(withNodes(null, nodes, 'project-1'))).toEqual({
      name: 'my-pipeline',
      projectId: 'project-1',
      nodes: [
        {
          id: 'build',
          deps: [],
          workingDir: '',
          env: [],
          timeoutSeconds: null,
          retries: 0,
          kind: 'exec',
          command: 'make',
          args: [],
        },
      ],
    });
  });

  it('preserves the rest of an already-parsed document — its name above all', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 's', deps: [], env: [], kind: 'script', script: 'echo hi', shell: 'bash' },
    ];

    const parsed = JSON.parse(withNodes({ name: 'my-ci' }, nodes, 'project-1')) as { name: string };
    expect(parsed.name).toBe('my-ci');
  });

  it('round-trips a node unchanged: the empty workingDir it writes reads back as none', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 's', deps: [], env: [], kind: 'script', script: 'echo hi', shell: 'bash' },
    ];

    expect(nodesOf(parseScript(withNodes(null, nodes, 'p')).document)).toEqual(nodes);
  });

  it('round-trips the timeout and the retries of a node', () => {
    const nodes: PipelineNodeEntity[] = [
      {
        id: 's',
        deps: [],
        env: [],
        kind: 'script',
        script: 'echo hi',
        shell: 'sh',
        timeoutSeconds: 30,
        retries: 2,
      },
    ];

    const document = parseScript(withNodes(null, nodes, 'p')).document;

    expect(document).toMatchObject({ nodes: [{ timeoutSeconds: 30, retries: 2 }] });
    expect(nodesOf(document)).toEqual(nodes);
  });

  it('writes no timeout as null and no retry as 0, and reads them back as none', () => {
    const nodes: PipelineNodeEntity[] = [
      { id: 's', deps: [], env: [], kind: 'script', script: 'echo hi', shell: 'sh' },
    ];

    const document = parseScript(withNodes(null, nodes, 'p')).document;

    expect(document).toMatchObject({ nodes: [{ timeoutSeconds: null, retries: 0 }] });
    expect(stepNodesOf(document)[0].timeoutSeconds).toBeUndefined();
    expect(stepNodesOf(document)[0].retries).toBeUndefined();
  });
});

describe('withName', () => {
  it('is a no-op while nothing has been parsed', () => {
    expect(withName(null, 'new-name')).toBeNull();
  });

  it('renames the parsed document, keeping everything else', () => {
    const renamed = JSON.parse(withName({ name: 'old', projectId: 'p' }, 'new-name')!) as {
      name: string;
      projectId: string;
    };
    expect(renamed).toEqual({ name: 'new-name', projectId: 'p' });
  });
});

describe('toDocument', () => {
  const pipeline: Pick<PipelineEntity, 'name' | 'projectId' | 'nodes'> & { id: string } = {
    id: 'pipeline-1',
    name: 'nightly',
    projectId: 'p',
    nodes: [
      { id: 'build', deps: [], env: [], kind: 'exec', command: 'make', args: [] },
      {
        id: 'test',
        deps: [{ node: 'build' }],
        env: [],
        kind: 'script',
        shell: 'sh',
        script: 'make test',
      },
    ],
  };

  it('writes only the fields the editor owns: no id travels back on save', () => {
    expect(Object.keys(JSON.parse(toDocument(pipeline)) as object)).toEqual([
      'name',
      'projectId',
      'nodes',
    ]);
  });

  it('reads back the same nodes', () => {
    const { document } = parseScript(toDocument(pipeline));
    expect(nodesOf(document)).toEqual(pipeline.nodes);
  });
});

describe('the switch, the merge and the needs on a port', () => {
  const nodes: PipelineNodeEntity[] = [
    { id: 'build', deps: [], env: [], kind: 'exec', command: 'make', args: [] },
    {
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
            { left: { kind: 'output', node: 'build', key: 'TAG' }, test: 'not_empty' },
          ],
        },
      ],
      otherwise: 'false',
      allMatches: false,
    },
    {
      id: 'deploy',
      deps: [{ node: 'build' }, { node: 'is-main', port: 'true' }],
      env: [],
      kind: 'script',
      shell: 'sh',
      script: './deploy.sh',
    },
    {
      id: 'always',
      deps: [{ node: 'deploy' }, { node: 'deploy', port: 'error' }],
      kind: 'merge',
    },
  ];

  it('writes a need on a port as one text, a switch under `switch` and a merge as `merge: {}`', () => {
    const written = JSON.parse(withNodes(null, nodes, 'p')) as { nodes: Record<string, unknown>[] };
    expect(written.nodes[1]).toMatchObject({
      kind: 'switch',
      switch: {
        cases: nodes[1].kind === 'switch' ? nodes[1].cases : [],
        otherwise: 'false',
        allMatches: false,
      },
    });
    expect(written.nodes[2].deps).toEqual(['build', 'is-main:true']);
    expect(written.nodes[3]).toEqual({
      id: 'always',
      deps: ['deploy', 'deploy:error'],
      kind: 'merge',
      merge: {},
    });
  });

  it('reads back what it writes', () => {
    expect(nodesOf(parseScript(withNodes(null, nodes, 'p')).document)).toEqual(nodes);
    const noOtherwise = { ...nodes[1], otherwise: undefined } as PipelineNodeEntity;
    const document = parseScript(withNodes(null, [noOtherwise], 'p')).document;
    expect(document).toMatchObject({ nodes: [{ switch: { otherwise: null } }] });
    expect(nodesOf(document)[0]).not.toHaveProperty('otherwise');
  });

  it('reads a switch and a merge by their field when the node has no kind', () => {
    const [ifNode, merge] = nodesOf(
      documentOf({
        nodes: [
          { id: 'a', switch: { cases: [] } },
          { id: 'b', merge: {} },
        ],
      }),
    );
    expect(ifNode).toEqual({
      id: 'a',
      deps: [],
      env: [],
      kind: 'switch',
      cases: [],
      allMatches: false,
    });
    expect(merge).toEqual({ id: 'b', deps: [], kind: 'merge' });
  });

  it('reads a switch with a port named error, which then stops the save', () => {
    const nodes = nodesOf(
      documentOf({
        nodes: [
          {
            id: 's',
            kind: 'switch',
            switch: {
              cases: [
                { port: 'error', rules: [{ left: { kind: 'var', name: 'A' }, test: 'empty' }] },
              ],
            },
          },
        ],
      }),
    );

    expect(nodes[0]).toMatchObject({ kind: 'switch', cases: [{ port: 'error' }] });
    expect(pipelineIssue({ name: 'nightly', nodes })).toEqual({ kind: 'nodes', ids: ['s'] });
  });

  it('reads a need with an empty port as a need with no port', () => {
    expect(nodesOf(documentOf({ nodes: [{ id: 'a', deps: ['b:'] }] }))[0].deps).toEqual([
      { node: 'b' },
    ]);
  });

  it('gives a rule the right value that its test needs, and a bad test the first one', () => {
    const [node] = nodesOf(
      documentOf({
        nodes: [
          {
            id: 's',
            switch: {
              cases: [
                {
                  port: 'x',
                  rules: [
                    { left: { kind: 'var', name: 'A' }, test: 'equals' },
                    {
                      left: { kind: 'literal', value: 'a' },
                      test: 'empty',
                      right: { kind: 'var', name: 'B' },
                    },
                    { test: 'regex' },
                  ],
                },
              ],
            },
          },
        ],
      }),
    );
    expect(node).toMatchObject({
      cases: [
        {
          combinator: 'all',
          rules: [
            {
              left: { kind: 'var', name: 'A' },
              test: 'equals',
              right: { kind: 'literal', value: '' },
            },
            { left: { kind: 'literal', value: 'a' }, test: 'empty' },
            {
              left: { kind: 'literal', value: '' },
              test: 'equals',
              right: { kind: 'literal', value: '' },
            },
          ],
        },
      ],
    });
    expect(node.kind === 'switch' && node.cases[0].rules[1]).not.toHaveProperty('right');
  });
});
