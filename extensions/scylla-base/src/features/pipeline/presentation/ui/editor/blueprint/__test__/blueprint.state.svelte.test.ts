import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { ExecPipelineNodeEntity, PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { createBlueprint } from '../blueprint.state.svelte.ts';
import { START_NODE_ID, flowToNodes } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import { createPipelineDocument } from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps,
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

const definition = { kind: 'exec', command: 'make', args: [], env: [] } as const satisfies Omit<
  ExecPipelineNodeEntity,
  'id' | 'deps'
>;

const withState = (
  initial: PipelineNodeEntity[],
  run: (state: ReturnType<typeof createBlueprint>, onNodesChange: ReturnType<typeof vi.fn>) => void,
) => {
  const onNodesChange = vi.fn();
  const cleanup = $effect.root(() => {
    const state = createBlueprint({
      nodes: () => initial,
      pipelineName: () => 'nightly',
      onNodesChange,
    });
    flushSync();
    run(state, onNodesChange);
  });
  cleanup();
};

describe('createBlueprint', () => {
  it('builds the graph from the nodes, with the start node', () => {
    withState([execNode('build'), execNode('test', ['build'])], state => {
      expect(state.flowNodes.map(flowNode => flowNode.id).sort()).toEqual([START_NODE_ID, 'build', 'test'].sort());
      expect(state.edges.some(edge => edge.source === 'build' && edge.target === 'test')).toBe(true);
    });
  });

  it('does not publish valid nodes back to the document', () => {
    withState([execNode('build')], (_state, onNodesChange) => {
      expect(onNodesChange).not.toHaveBeenCalled();
    });
  });

  it('never rewrites the document to repair it', () => {
    withState([execNode('build', ['ghost']), execNode('test'), execNode('test')], (_s, onChange) => {
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('shows two nodes with the same id, but edits nothing until each has its own id', () => {
    withState([execNode('build'), execNode('build')], (state, onNodesChange) => {
      expect(state.readOnly).toBe(true);

      state.addNode('lint', definition);
      state.updateNode('build', definition);
      state.removeNode('build');
      state.inspect('build');

      expect(onNodesChange).not.toHaveBeenCalled();
      expect(state.inspected).toBeUndefined();
      expect(state.canConnect({ source: START_NODE_ID, target: 'build' } as never)).toBe(false);
    });
  });

  it('refuses an edge into the start node', () => {
    withState([execNode('build')], state => {
      expect(state.canConnect({ source: 'build', target: START_NODE_ID } as never)).toBe(false);
      expect(state.canConnect({ source: START_NODE_ID, target: 'build' } as never)).toBe(true);
    });
  });

  it('refuses an edge that closes a loop', () => {
    withState([execNode('build'), execNode('test', ['build'])], state => {
      expect(state.canConnect({ source: 'test', target: 'build' } as never)).toBe(false);
      expect(state.canConnect({ source: 'build', target: 'build' } as never)).toBe(false);
      expect(state.canConnect({ source: 'build', target: 'test' } as never)).toBe(true);
    });
  });

  it('adds a node with a unique id and publishes it', () => {
    withState([execNode('build')], (state, onNodesChange) => {
      state.addNode('build', { kind: 'exec', command: 'make', args: [], env: [] });

      const published = onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[];
      expect(published.map(node => node.id)).toEqual(['build', 'build_1']);
    });
  });

  it('renames a node everywhere its id is written', () => {
    withState([execNode('build'), execNode('test', ['build'])], (state, onNodesChange) => {
      state.updateNode('build', { kind: 'exec', command: 'make', args: [], env: [] });
      expect(state.renameNode('build', 'compile')).toBe('compile');

      const published = onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[];
      expect(published.find(node => node.id === 'compile')).toMatchObject({ command: 'make' });
      expect(published.find(node => node.id === 'test')?.deps).toEqual(['compile']);
      expect(state.edges.some(edge => edge.source === 'compile' && edge.target === 'test')).toBe(true);
    });
  });

  it('publishes the graph when the canvas changes it', () => {
    withState([execNode('build'), execNode('test', ['build'])], (state, onNodesChange) => {
      state.edges = state.edges.filter(edge => edge.target !== 'test');
      state.sync();

      expect(onNodesChange).toHaveBeenLastCalledWith(flowToNodes(state.flowNodes, state.edges));
      expect(
        (onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[]).find(node => node.id === 'test')?.deps,
      ).toEqual([]);
    });
  });

  it('does not publish the same document twice', () => {
    withState([execNode('build')], (state, onNodesChange) => {
      state.sync();
      const calls = onNodesChange.mock.calls.length;
      state.sync();

      expect(onNodesChange.mock.calls.length).toBe(calls);
    });
  });
  it('keeps the id when the new one is empty, and suffixes a taken one', () => {
    withState([execNode('build'), execNode('test')], state => {
      expect(state.renameNode('build', '  ')).toBe('build');
      expect(state.renameNode('build', 'test')).toBe('test_1');
    });
  });

  it('links a node added after a node, and leaves the side panel as it was', () => {
    withState([execNode('build')], (state, onNodesChange) => {
      state.inspect('build');
      state.addNode('test', definition, { after: 'build' });

      expect(state.inspected?.id).toBe('build');
      expect(state.flowNodes.filter(flowNode => flowNode.selected).map(flowNode => flowNode.id)).toEqual(['build']);
      const published = onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[];
      expect(published.find(node => node.id === 'test')?.deps).toEqual(['build']);
    });
  });

  it('hangs a node added with no link off the start node, right of the graph', () => {
    withState([execNode('build')], state => {
      const build = state.flowNodes.find(flowNode => flowNode.id === 'build')!;
      state.addNode('lint', definition);

      const lint = state.flowNodes.find(flowNode => flowNode.id === 'lint')!;
      expect(lint.position.x).toBeGreaterThan(build.position.x);
      expect(
        state.edges.some(edge => edge.source === START_NODE_ID && edge.target === 'lint'),
      ).toBe(true);
    });
  });

  it('places a dropped node where it was dropped', () => {
    withState([], state => {
      state.addNode('lint', definition, { position: { x: 12, y: 34 } });
      expect(state.flowNodes.find(flowNode => flowNode.id === 'lint')?.position).toEqual({ x: 12, y: 34 });
    });
  });

  it('splits an edge around an inserted node', () => {
    withState([execNode('build'), execNode('test', ['build'])], (state, onNodesChange) => {
      state.addNode('lint', definition, { replacing: 'build->test' });

      expect(state.edges.some(edge => edge.id === 'build->test')).toBe(false);
      const published = onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[];
      expect(published.find(node => node.id === 'lint')?.deps).toEqual(['build']);
      expect(published.find(node => node.id === 'test')?.deps).toEqual(['lint']);
    });
  });

  it('removes a node with its edges, but never the start node', () => {
    withState([execNode('build'), execNode('test', ['build'])], (state, onNodesChange) => {
      state.removeNode(START_NODE_ID);
      expect(state.flowNodes.some(flowNode => flowNode.id === START_NODE_ID)).toBe(true);

      state.removeNode('build');
      expect(state.edges.some(edge => edge.source === 'build')).toBe(false);
      const published = onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[];
      expect(published.map(node => node.id)).toEqual(['test']);
    });
  });

  it('opens the side panel on the inspected node, selected on the canvas', () => {
    withState([execNode('build'), execNode('test')], state => {
      state.inspect('build');
      expect(state.inspected?.id).toBe('build');
      expect(state.flowNodes.filter(flowNode => flowNode.selected).map(flowNode => flowNode.id)).toEqual(['build']);

      state.inspect(null);
      expect(state.inspected).toBeUndefined();
      expect(state.flowNodes.some(flowNode => flowNode.selected)).toBe(false);
    });
  });

  it('never opens the side panel on the start node: the header edits the name', () => {
    withState([execNode('build')], state => {
      state.inspect('build');
      state.inspect(START_NODE_ID);
      expect(state.inspected).toBeUndefined();
    });
  });

  it('never opens the side panel for a selection made on the canvas', () => {
    withState([execNode('build'), execNode('test')], state => {
      state.flowNodes = state.flowNodes.map(flowNode => ({ ...flowNode, selected: true }));
      expect(state.inspected).toBeUndefined();
    });
  });

  it('follows the inspected node through a rename, and closes when it is deleted', () => {
    withState([execNode('build'), execNode('test')], state => {
      state.inspect('build');
      state.renameNode('build', 'compile');
      expect(state.inspected?.id).toBe('compile');

      state.flowNodes = state.flowNodes.filter(flowNode => flowNode.id !== 'compile');
      state.sync();
      expect(state.inspected).toBeUndefined();
    });
  });

  it('calls a node detached when no edge goes into it, not even from the start node', () => {
    withState([execNode('build'), execNode('test', ['build'])], state => {
      expect(state.isDetached('build')).toBe(false);

      state.edges = state.edges.filter(edge => edge.source !== START_NODE_ID);
      expect(state.isDetached('build')).toBe(true);
      expect(state.isDetached('test')).toBe(false);
    });
  });

  it('lists the dependencies of a node, without the start node', () => {
    withState([execNode('build'), execNode('test', ['build'])], state => {
      expect(state.dependenciesOf('test')).toEqual(['build']);
      expect(state.dependenciesOf('build')).toEqual([]);
    });
  });

  it('lays the graph out again by depth', () => {
    withState([execNode('build'), execNode('test', ['build'])], state => {
      state.flowNodes = state.flowNodes.map(flowNode => ({ ...flowNode, position: { x: 0, y: 0 } }));
      state.arrange();

      const x = (id: string) => state.flowNodes.find(flowNode => flowNode.id === id)!.position.x;
      expect(x('build')).toBeLessThan(x('test'));
    });
  });
});

const SCRIPT = JSON.stringify({
  name: 'nightly',
  nodes: [
    { id: 'build', deps: [], workingDir: '', env: [], kind: 'script', shell: 'bash', script: 'make' },
  ],
});

/** The blueprint wired to the editor's document, as `PipelineEditor` wires them. */
const withEditor = (run: (state: ReturnType<typeof createBlueprint>) => void) => {
  const cleanup = $effect.root(() => {
    const doc = createPipelineDocument({ projectId: () => 'p', initialScript: () => SCRIPT });
    flushSync();
    const state = createBlueprint({
      nodes: () => doc.nodes,
      pipelineName: () => doc.pipelineName,
      onNodesChange: nodes => doc.setNodes(nodes),
    });
    flushSync();
    run(state);
  });
  cleanup();
};

describe('the blueprint over the document', () => {
  it('keeps the side panel open while the inspected node is edited', () => {
    withEditor(state => {
      state.inspect('build');
      state.updateNode('build', { kind: 'script', shell: 'sh', script: 'make all', env: [] });
      flushSync();
      state.updateNode('build', { kind: 'exec', command: 'make', args: [], env: [] });
      flushSync();

      expect(state.inspected?.id).toBe('build');
    });
  });

  it('keeps a dropped node where it was dropped', () => {
    withEditor(state => {
      state.addNode('lint', { kind: 'exec', command: 'eslint', args: [], workingDir: '', env: [] }, {
        position: { x: 640, y: 480 },
      });
      flushSync();

      expect(state.flowNodes.find(flowNode => flowNode.id === 'lint')?.position).toEqual({ x: 640, y: 480 });
    });
  });
});
