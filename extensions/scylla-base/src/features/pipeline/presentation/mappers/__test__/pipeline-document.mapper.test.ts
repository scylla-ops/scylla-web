// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineEntity } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import {
  nameOf,
  parseScript,
  nodesOf,
  withName,
  withNodes,
  toDocument,
} from '../pipeline-document.mapper.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const documentOf = (value: unknown) => parseScript(JSON.stringify(value)).document;

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

      expect(node.deps).toEqual(['x']);
      expect(other.deps).toEqual([]);
    });
  });

  describe('env parsing', () => {
    it('tolerates a literal entry missing its value', () => {
      const [node] = nodesOf(
        documentOf({ nodes: [{ id: 'a', command: 'x', env: [{ key: 'K' }] }] }),
      );
      expect(node.env).toEqual([{ key: 'K', kind: 'literal', value: '' }]);
    });

    it('tolerates a secret entry missing its secretRef', () => {
      const [node] = nodesOf(
        documentOf({ nodes: [{ id: 'a', command: 'x', env: [{ key: 'K', kind: 'secret' }] }] }),
      );
      expect(node.env).toEqual([{ key: 'K', kind: 'secret', secretRef: '' }]);
    });

    it('a non-array env is treated as empty rather than throwing', () => {
      const [node] = nodesOf(documentOf({ nodes: [{ id: 'a', command: 'x', env: 'nope' }] }));
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
        { id: 'build', deps: [], workingDir: '', env: [], kind: 'exec', command: 'make', args: [] },
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
      { id: 'test', deps: ['build'], env: [], kind: 'script', shell: 'sh', script: 'make test' },
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
