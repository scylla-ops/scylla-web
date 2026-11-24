import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import type * as Utils from '@scylla/ui/utils';
import type {
  Dependency,
  ExecPipelineNodeEntity,
  PipelineNodeEntity,
  SwitchPipelineNodeEntity,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import type { PipelineLayout } from '@base/features/pipeline/domain/structs/pipeline-layout.struct.ts';
import { createBlueprint } from '../blueprint.state.svelte.ts';
import { START_NODE_ID, flowToNodes } from '@base/features/pipeline/presentation/mappers/blueprint-flow.mapper.ts';
import { createPipelineDocument } from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@scylla/ui/utils', async importOriginal => ({
  ...(await importOriginal<typeof Utils>()),
  toast,
}));

/** `is-main:true` is a need on the port `true` of `is-main`. */
const needs = (texts: string[]): Dependency[] =>
  texts.map(text => {
    const [node, port] = text.split(':');
    return port ? { node, port } : { node };
  });
const textsOf = (deps: Dependency[] | undefined) =>
  deps?.map(({ node, port }) => (port ? `${node}:${port}` : node));

const execNode = (id: string, deps: string[] = []): ExecPipelineNodeEntity => ({
  id,
  deps: needs(deps),
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
      expect(textsOf(published.find(node => node.id === 'test')?.deps)).toEqual(['compile']);
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
      expect(textsOf(published.find(node => node.id === 'test')?.deps)).toEqual(['build']);
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
      expect(textsOf(published.find(node => node.id === 'lint')?.deps)).toEqual(['build']);
      expect(textsOf(published.find(node => node.id === 'test')?.deps)).toEqual(['lint']);
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
      expect(textsOf(state.dependenciesOf('test'))).toEqual(['build']);
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

const ifNode = (id: string, deps: string[] = []): SwitchPipelineNodeEntity => ({
  id,
  deps: needs(deps),
  env: [],
  kind: 'switch',
  cases: [{ port: 'true', combinator: 'all', rules: [{ left: { kind: 'var', name: 'A' }, test: 'not_empty' }] }],
  otherwise: 'false',
  allMatches: false,
});

describe('the ports', () => {
  afterEach(() => toast.mockClear());

  const undo = () => (toast.mock.lastCall?.[1] as { action: { onClick: () => void } }).action.onClick();
  const published = (onNodesChange: ReturnType<typeof vi.fn>, id: string) =>
    (onNodesChange.mock.lastCall?.[0] as PipelineNodeEntity[]).find(node => node.id === id);
  const pipeline = () => [execNode('build'), ifNode('is-main', ['build']), execNode('deploy', ['build', 'is-main:true'])];

  it('draws a need on a port from the handle of the port', () => {
    withState(pipeline(), state => {
      expect(state.edges).toContainEqual(
        expect.objectContaining({ id: 'is-main:true->deploy', source: 'is-main', sourceHandle: 'true', target: 'deploy' }),
      );
    });
  });

  it('saves a link from a port handle as a need with that port', () => {
    withState(pipeline(), (state, onNodesChange) => {
      state.edges = [...state.edges, { id: 'xy', source: 'is-main', sourceHandle: 'false', target: 'build' }].filter(
        edge => edge.target !== 'build' || edge.source !== START_NODE_ID,
      );
      state.sync();
      expect(textsOf(published(onNodesChange, 'build')?.deps)).toEqual(['is-main:false']);
    });
  });

  it('links a node added from a port to that port', () => {
    withState(pipeline(), (state, onNodesChange) => {
      state.addNode('cleanup', definition, { after: 'is-main', port: 'false' });
      expect(textsOf(published(onNodesChange, 'cleanup')?.deps)).toEqual(['is-main:false']);
    });
  });

  it('keeps the port when a node is inserted in an edge from a port', () => {
    withState(pipeline(), (state, onNodesChange) => {
      state.addNode('check', definition, { replacing: 'is-main:true->deploy' });
      expect(textsOf(published(onNodesChange, 'check')?.deps)).toEqual(['is-main:true']);
      expect(textsOf(published(onNodesChange, 'deploy')?.deps)).toEqual(['build', 'check']);
    });
  });

  it('keeps the port of each edge when a node is renamed', () => {
    withState(pipeline(), (state, onNodesChange) => {
      state.renameNode('is-main', 'on-main');
      expect(textsOf(published(onNodesChange, 'deploy')?.deps)).toEqual(['build', 'on-main:true']);
      expect(state.edges.some(edge => edge.id === 'on-main:true->deploy')).toBe(true);
    });
  });

  it('moves the edges of a renamed port to its new name', () => {
    withState(pipeline(), (state, onNodesChange) => {
      const renamed = { ...ifNode('is-main'), cases: [{ ...ifNode('is-main').cases[0], port: 'yes' }] };
      state.updateNode('is-main', renamed, { from: 'true', to: 'yes' });
      expect(textsOf(published(onNodesChange, 'deploy')?.deps)).toEqual(['build', 'is-main:yes']);
      expect(state.edges).toContainEqual(expect.objectContaining({ id: 'is-main:yes->deploy', sourceHandle: 'yes' }));
    });
  });

  it('removes the edges of a deleted case, and puts back the case and its edges on undo', () => {
    withState(pipeline(), (state, onNodesChange) => {
      const { env, kind, otherwise, allMatches } = ifNode('is-main');
      state.updateNode('is-main', { env, kind, cases: [], otherwise, allMatches }, { from: 'true', to: null });

      expect(textsOf(published(onNodesChange, 'deploy')?.deps)).toEqual(['build']);
      expect(toast).toHaveBeenCalledWith('These nodes no longer wait for is-main:true: deploy.', expect.anything());

      const revision = state.revision;
      undo();
      expect(textsOf(published(onNodesChange, 'deploy')?.deps)).toEqual(['build', 'is-main:true']);
      expect(published(onNodesChange, 'is-main')).toMatchObject({ cases: [{ port: 'true' }] });
      expect(state.revision).toBe(revision + 1);
    });
  });

  it('shows the error output while its toggle is on, or while an edge leaves from it', () => {
    withState([execNode('test'), execNode('notify', ['test:error'])], state => {
      expect(state.hasErrorPort('test')).toBe(true);
      expect(state.hasErrorPort('notify')).toBe(false);

      state.setErrorOutput('notify', true);
      expect(state.hasErrorPort('notify')).toBe(true);
    });
  });

  it('removes the error edges when the toggle goes off, and puts them back on undo', () => {
    withState([execNode('test'), execNode('notify', ['test:error'])], (state, onNodesChange) => {
      state.setErrorOutput('test', false);
      expect(published(onNodesChange, 'notify')?.deps).toEqual([]);
      expect(state.hasErrorPort('test')).toBe(false);

      undo();
      expect(textsOf(published(onNodesChange, 'notify')?.deps)).toEqual(['test:error']);
      expect(state.hasErrorPort('test')).toBe(true);
    });
  });

  it('refuses a link from an error output of a node that runs no step', () => {
    withState(pipeline(), state => {
      expect(state.canConnect({ source: 'is-main', sourceHandle: 'error', target: 'deploy' } as never)).toBe(false);
      expect(state.canConnect({ source: 'build', sourceHandle: 'error', target: 'is-main' } as never)).toBe(true);
    });
  });

  it('gives the issue of a node in its pipeline', () => {
    withState([execNode('build'), execNode('deploy', ['build:true'])], state => {
      expect(state.issueOf('deploy')).toMatchObject({ kind: 'need', issue: { kind: 'unknown-port' } });
      expect(state.issueOf('build')).toBeNull();
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

describe('the places of the canvas', () => {
  const withPlaces = (
    nodes: PipelineNodeEntity[],
    run: (
      state: ReturnType<typeof createBlueprint>,
      places: { connect: ReturnType<typeof vi.fn>; moved: ReturnType<typeof vi.fn> },
    ) => void,
    savedLayout: PipelineLayout | null = null,
  ) => {
    const places = { connect: vi.fn(), moved: vi.fn(), waiting: vi.fn() };
    const cleanup = $effect.root(() => {
      const state = createBlueprint({
        nodes: () => nodes,
        pipelineName: () => 'nightly',
        onNodesChange: vi.fn(),
        savedLayout: () => savedLayout,
        places,
      });
      flushSync();
      run(state, places);
    });
    cleanup();
  };

  it('opens each node on its saved place', () => {
    withPlaces(
      [execNode('build')],
      state => {
        expect(state.flowNodes.find(({ id }) => id === 'build')?.position).toEqual({ x: 70, y: 80 });
        expect(state.flowNodes.find(({ id }) => id === START_NODE_ID)?.position).toEqual({ x: 5, y: 6 });
      },
      { start: { x: 5, y: 6 }, nodes: { build: { x: 70, y: 80 } } },
    );
  });

  it('reports the nodes of a drag', () => {
    withPlaces([execNode('build')], (state, places) => {
      const dragged = state.flowNodes.filter(({ id }) => id === 'build');
      state.placesMoved(dragged);

      expect(places.moved).toHaveBeenCalledWith(dragged);
    });
  });

  it('reports all the places after an arrange', () => {
    withPlaces([execNode('build')], (state, places) => {
      state.arrange();

      expect(places.moved).toHaveBeenCalledWith(state.flowNodes);
    });
  });

  it('saves nothing on a read-only canvas', () => {
    withPlaces([execNode('build'), execNode('build')], (state, places) => {
      expect(state.readOnly).toBe(true);
      state.placesMoved(state.flowNodes);
      state.arrange();

      expect(places.moved).not.toHaveBeenCalled();
    });
  });

  it('keeps the saved place of a switch and its edges when a port is renamed or the error output goes', () => {
    withPlaces(
      [execNode('test'), ifNode('is-main', ['test']), execNode('deploy', ['is-main:true', 'test:error'])],
      state => {
        const renamed = { ...ifNode('is-main'), cases: [{ ...ifNode('is-main').cases[0], port: 'yes' }] };
        state.updateNode('is-main', renamed, { from: 'true', to: 'yes' });
        state.setErrorOutput('test', false);

        expect(state.flowNodes.find(({ id }) => id === 'is-main')?.position).toEqual({ x: 70, y: 80 });
        expect(state.edges).toContainEqual(expect.objectContaining({ id: 'is-main:yes->deploy', sourceHandle: 'yes' }));
        expect(state.edges.some(edge => edge.sourceHandle === 'error')).toBe(false);
      },
      { nodes: { 'is-main': { x: 70, y: 80 } } },
    );
  });

  it('reports a switch and a merge in a drag, with their edges left as they are', () => {
    const join: PipelineNodeEntity = { id: 'join', deps: needs(['is-main:true', 'is-main:false']), kind: 'merge' };
    withPlaces([ifNode('is-main'), join], (state, places) => {
      const edges = state.edges;
      state.placesMoved(state.flowNodes);

      expect(places.moved).toHaveBeenCalledWith(state.flowNodes);
      expect(state.edges).toBe(edges);
      const into = state.edges.filter(edge => edge.target === 'join');
      expect(into.map(edge => edge.sourceHandle)).toEqual(['true', 'false']);
    });
  });

  it('gives the planner the graph that it holds', () => {
    withPlaces([execNode('build')], (state, places) => {
      const read = places.connect.mock.calls[0]?.[0] as () => unknown;

      expect(read()).toBe(state.flowNodes);
    });
  });
});
