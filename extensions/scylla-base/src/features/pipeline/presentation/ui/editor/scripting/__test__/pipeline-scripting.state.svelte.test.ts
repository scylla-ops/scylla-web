import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import type * as Utils from '@scylla/ui/utils';
import {
  createPipelineDocument,
  type PipelineDocument,
} from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';
import {
  createPipelineScripting,
  type PipelineScripting,
} from '../pipeline-scripting.state.svelte.ts';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@scylla/ui/utils', async importOriginal => ({
  ...(await importOriginal<typeof Utils>()),
  toast,
}));

const document = JSON.stringify({
  name: 'web',
  nodes: [
    { id: 'build', deps: [], kind: 'script', shell: 'bash', script: 'make', env: [] },
    { id: 'test', deps: ['build'], kind: 'exec', command: 'make', args: ['test'], env: [] },
  ],
});

const withScripting = (
  run: (scripting: PipelineScripting, doc: PipelineDocument) => void,
  initialScript = document,
) => {
  const cleanup = $effect.root(() => {
    const doc = createPipelineDocument({
      projectId: () => 'project-1',
      initialScript: () => initialScript,
    });
    const scripting = createPipelineScripting({
      nodes: () => doc.nodes,
      isValid: () => doc.isValid,
      onNodesChange: nodes => doc.setNodes(nodes),
    });
    flushSync();
    run(scripting, doc);
  });
  cleanup();
};

const nodeIn = (doc: PipelineDocument, id: string) => doc.nodes.find(node => node.id === id);

describe('createPipelineScripting', () => {
  it('shows the nodes one by one by default', () => {
    withScripting(scripting => {
      expect(scripting.mode).toBe('nodes');
      expect(scripting.focusedNode?.id).toBe('build');
    });
  });

  it('shows the full document while it does not parse', () => {
    withScripting((scripting, doc) => {
      doc.setScript('{ "nodes": [');
      flushSync();

      expect(scripting.canShowNodes).toBe(false);
      expect(scripting.mode).toBe('document');
    });
  });

  it.each([
    ['two nodes share an id', [{ id: 'a' }, { id: 'a' }]],
    ['a node lists a dependency twice', [{ id: 'a' }, { id: 'b', deps: ['a', 'a'] }]],
  ])('shows the full document, not the nodes, when %s', (_, nodes) => {
    withScripting(
      scripting => {
        expect(scripting.canShowNodes).toBe(false);
        expect(scripting.mode).toBe('document');
      },
      JSON.stringify({ name: 'web', nodes }),
    );
  });

  it('writes an edit of a node to the document', () => {
    withScripting((scripting, doc) => {
      const node = scripting.nodeOf('build')!;
      scripting.draftOf(node).script = 'make all';
      flushSync();

      expect(nodeIn(doc, 'build')).toMatchObject({ script: 'make all', deps: [] });
      expect(doc.script).toContain('make all');
    });
  });

  it('renames a node in the document, in the dependencies and in the open tabs', () => {
    withScripting((scripting, doc) => {
      const draft = scripting.draftOf(scripting.nodeOf('build')!);
      draft.id = 'compile';
      draft.rename();
      flushSync();

      expect(doc.nodes.map(node => node.id)).toEqual(['compile', 'test']);
      expect(nodeIn(doc, 'test')?.deps).toEqual(['compile']);
      expect(scripting.panes.focusedId).toBe('compile');

      // The renamed node keeps its draft: an edit after the rename still reaches the document.
      expect(scripting.draftOf(scripting.nodeOf('compile')!)).toBe(draft);
      draft.script = 'make all';
      flushSync();
      expect(nodeIn(doc, 'compile')).toMatchObject({ script: 'make all' });
    });
  });

  it('adds a node after the focused one, and opens it', () => {
    withScripting((scripting, doc) => {
      scripting.add();
      flushSync();

      expect(nodeIn(doc, 'node')).toMatchObject({ deps: ['build'], kind: 'script', shell: 'bash' });
      expect(scripting.panes.focusedId).toBe('node');
    });
  });

  it('removes a node and the dependencies on it', () => {
    withScripting((scripting, doc) => {
      scripting.remove('build');
      flushSync();

      expect(doc.nodes.map(node => node.id)).toEqual(['test']);
      expect(nodeIn(doc, 'test')?.deps).toEqual([]);
    });
  });

  it('offers as dependencies only the nodes that do not wait for the node', () => {
    withScripting(scripting => {
      expect(scripting.dependencyCandidates('build')).toEqual([]);
      expect(scripting.dependencyCandidates('test')).toEqual(['build']);
      expect(scripting.dependentsOf('build')).toEqual(['test']);
    });
  });

  describe('moveNode', () => {
    const graph = JSON.stringify({
      name: 'web',
      nodes: ['build', 'lint', 'test', 'deploy'].map(id => ({
        id,
        deps: { test: ['build', 'lint'], deploy: ['test'] }[id] ?? [],
        kind: 'script',
        shell: 'bash',
        script: 'make',
        env: [],
      })),
    });

    afterEach(() => toast.mockClear());

    const undo = () => {
      const options = toast.mock.calls[0][1] as { action: { onClick: () => void } };
      options.action.onClick();
    };

    it('makes a node wait only for the node it is dropped on, and offers to undo', () => {
      withScripting((scripting, doc) => {
        scripting.moveNode('test', 'build', false);
        flushSync();

        expect(nodeIn(doc, 'test')?.deps).toEqual(['build']);
        expect(toast).toHaveBeenCalledOnce();

        undo();
        flushSync();
        expect(nodeIn(doc, 'test')?.deps).toEqual(['build', 'lint']);
      }, graph);
    });

    it('keeps the other dependencies with keep, and says nothing', () => {
      withScripting((scripting, doc) => {
        scripting.moveNode('deploy', 'lint', true);
        flushSync();

        expect(nodeIn(doc, 'deploy')?.deps).toEqual(['test', 'lint']);
        expect(toast).not.toHaveBeenCalled();
      }, graph);
    });

    it('makes a node run first when dropped on no node', () => {
      withScripting((scripting, doc) => {
        scripting.moveNode('deploy', null, false);
        flushSync();

        expect(nodeIn(doc, 'deploy')?.deps).toEqual([]);
      }, graph);
    });

    it('rearranges the dependencies when a node is dropped on a node that waits for it', () => {
      withScripting((scripting, doc) => {
        scripting.moveNode('test', 'deploy', false);
        flushSync();

        expect(nodeIn(doc, 'deploy')?.deps).toEqual(['build', 'lint']);
        expect(nodeIn(doc, 'test')?.deps).toEqual(['deploy']);
        expect(toast).toHaveBeenCalledOnce();

        undo();
        flushSync();
        expect(nodeIn(doc, 'test')?.deps).toEqual(['build', 'lint']);
        expect(nodeIn(doc, 'deploy')?.deps).toEqual(['test']);
      }, graph);
    });

    it('does not restore on undo a dependency that now makes a loop', () => {
      withScripting((scripting, doc) => {
        scripting.moveNode('test', null, false);
        scripting.moveNode('lint', 'test', false);
        flushSync();

        undo();
        flushSync();
        expect(nodeIn(doc, 'test')?.deps).toEqual(['build']);
      }, graph);
    });
  });
});
