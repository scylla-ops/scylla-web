import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type {
  ExecPipelineStep,
  PipelineStep,
} from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { createBlueprintState } from '../blueprint.state.svelte.ts';
import { START_NODE_ID, flowToSteps } from '@base/features/pipeline/presentation/utils/blueprint-converter.ts';

const execStep = (id: string, deps: string[] = []): ExecPipelineStep => ({
  id,
  deps,
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

const definition = { kind: 'exec', command: 'make', args: [], env: [] } as const satisfies Omit<
  ExecPipelineStep,
  'id' | 'deps'
>;

const withState = (
  initial: PipelineStep[],
  run: (state: ReturnType<typeof createBlueprintState>, onStepsChange: ReturnType<typeof vi.fn>) => void,
) => {
  const onStepsChange = vi.fn();
  const cleanup = $effect.root(() => {
    const state = createBlueprintState({
      steps: () => initial,
      pipelineName: () => 'nightly',
      onStepsChange,
    });
    flushSync();
    run(state, onStepsChange);
  });
  cleanup();
};

describe('createBlueprintState', () => {
  it('builds the graph from the steps, with the start node', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      expect(state.nodes.map(node => node.id).sort()).toEqual([START_NODE_ID, 'build', 'test'].sort());
      expect(state.edges.some(edge => edge.source === 'build' && edge.target === 'test')).toBe(true);
    });
  });

  it('does not publish valid steps back to the document', () => {
    withState([execStep('build')], (_state, onStepsChange) => {
      expect(onStepsChange).not.toHaveBeenCalled();
    });
  });

  it('publishes the steps again when it had to repair them', () => {
    withState([execStep('build', ['ghost'])], (_state, onStepsChange) => {
      expect(onStepsChange).toHaveBeenCalledWith([execStep('build')]);
    });
  });

  it('refuses an edge into the start node', () => {
    withState([execStep('build')], state => {
      expect(state.canConnect({ source: 'build', target: START_NODE_ID } as never)).toBe(false);
      expect(state.canConnect({ source: START_NODE_ID, target: 'build' } as never)).toBe(true);
    });
  });

  it('refuses an edge that closes a loop', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      expect(state.canConnect({ source: 'test', target: 'build' } as never)).toBe(false);
      expect(state.canConnect({ source: 'build', target: 'build' } as never)).toBe(false);
      expect(state.canConnect({ source: 'build', target: 'test' } as never)).toBe(true);
    });
  });

  it('adds a step with a unique id and publishes it', () => {
    withState([execStep('build')], (state, onStepsChange) => {
      state.addNode('build', { kind: 'exec', command: 'make', args: [], env: [] });

      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.map(step => step.id)).toEqual(['build', 'build_1']);
    });
  });

  it('renames a step everywhere its id is written', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      state.updateStep('build', { kind: 'exec', command: 'make', args: [], env: [] });
      expect(state.renameStep('build', 'compile')).toBe('compile');

      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.find(step => step.id === 'compile')).toMatchObject({ command: 'make' });
      expect(published.find(step => step.id === 'test')?.deps).toEqual(['compile']);
      expect(state.edges.some(edge => edge.source === 'compile' && edge.target === 'test')).toBe(true);
    });
  });

  it('publishes the graph when the canvas changes it', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      state.edges = state.edges.filter(edge => edge.target !== 'test');
      state.sync();

      expect(onStepsChange).toHaveBeenLastCalledWith(flowToSteps(state.nodes, state.edges));
      expect(
        (onStepsChange.mock.lastCall?.[0] as PipelineStep[]).find(step => step.id === 'test')?.deps,
      ).toEqual([]);
    });
  });

  it('does not publish the same document twice', () => {
    withState([execStep('build')], (state, onStepsChange) => {
      state.sync();
      const calls = onStepsChange.mock.calls.length;
      state.sync();

      expect(onStepsChange.mock.calls.length).toBe(calls);
    });
  });
  it('keeps the id when the new one is empty, and suffixes a taken one', () => {
    withState([execStep('build'), execStep('test')], state => {
      expect(state.renameStep('build', '  ')).toBe('build');
      expect(state.renameStep('build', 'test')).toBe('test_1');
    });
  });

  it('links a step added after a node, and leaves the side panel as it was', () => {
    withState([execStep('build')], (state, onStepsChange) => {
      state.inspect('build');
      state.addNode('test', definition, { after: 'build' });

      expect(state.inspected?.id).toBe('build');
      expect(state.nodes.filter(node => node.selected).map(node => node.id)).toEqual(['build']);
      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.find(step => step.id === 'test')?.deps).toEqual(['build']);
    });
  });

  it('hangs a step added with no link off the start node, right of the graph', () => {
    withState([execStep('build')], state => {
      const build = state.nodes.find(node => node.id === 'build')!;
      state.addNode('lint', definition);

      const lint = state.nodes.find(node => node.id === 'lint')!;
      expect(lint.position.x).toBeGreaterThan(build.position.x);
      expect(
        state.edges.some(edge => edge.source === START_NODE_ID && edge.target === 'lint'),
      ).toBe(true);
    });
  });

  it('places a dropped step where it was dropped', () => {
    withState([], state => {
      state.addNode('lint', definition, { position: { x: 12, y: 34 } });
      expect(state.nodes.find(node => node.id === 'lint')?.position).toEqual({ x: 12, y: 34 });
    });
  });

  it('splits an edge around an inserted step', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      state.addNode('lint', definition, { replacing: 'build->test' });

      expect(state.edges.some(edge => edge.id === 'build->test')).toBe(false);
      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.find(step => step.id === 'lint')?.deps).toEqual(['build']);
      expect(published.find(step => step.id === 'test')?.deps).toEqual(['lint']);
    });
  });

  it('removes a step with its edges, but never the start node', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      state.removeStep(START_NODE_ID);
      expect(state.nodes.some(node => node.id === START_NODE_ID)).toBe(true);

      state.removeStep('build');
      expect(state.edges.some(edge => edge.source === 'build')).toBe(false);
      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.map(step => step.id)).toEqual(['test']);
    });
  });

  it('opens the side panel on the inspected node, selected on the canvas', () => {
    withState([execStep('build'), execStep('test')], state => {
      state.inspect('build');
      expect(state.inspected?.id).toBe('build');
      expect(state.nodes.filter(node => node.selected).map(node => node.id)).toEqual(['build']);

      state.inspect(null);
      expect(state.inspected).toBeUndefined();
      expect(state.nodes.some(node => node.selected)).toBe(false);
    });
  });

  it('never opens the side panel on the start node: the header edits the name', () => {
    withState([execStep('build')], state => {
      state.inspect('build');
      state.inspect(START_NODE_ID);
      expect(state.inspected).toBeUndefined();
    });
  });

  it('never opens the side panel for a selection made on the canvas', () => {
    withState([execStep('build'), execStep('test')], state => {
      state.nodes = state.nodes.map(node => ({ ...node, selected: true }));
      expect(state.inspected).toBeUndefined();
    });
  });

  it('follows the inspected step through a rename, and closes when it is deleted', () => {
    withState([execStep('build'), execStep('test')], state => {
      state.inspect('build');
      state.renameStep('build', 'compile');
      expect(state.inspected?.id).toBe('compile');

      state.nodes = state.nodes.filter(node => node.id !== 'compile');
      state.sync();
      expect(state.inspected).toBeUndefined();
    });
  });

  it('calls a step detached when no edge goes into it, not even from the start node', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      expect(state.isDetached('build')).toBe(false);

      state.edges = state.edges.filter(edge => edge.source !== START_NODE_ID);
      expect(state.isDetached('build')).toBe(true);
      expect(state.isDetached('test')).toBe(false);
    });
  });

  it('lists the dependencies of a step, without the start node', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      expect(state.dependenciesOf('test')).toEqual(['build']);
      expect(state.dependenciesOf('build')).toEqual([]);
    });
  });

  it('lays the graph out again by depth', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      state.nodes = state.nodes.map(node => ({ ...node, position: { x: 0, y: 0 } }));
      state.arrange();

      const x = (id: string) => state.nodes.find(node => node.id === id)!.position.x;
      expect(x('build')).toBeLessThan(x('test'));
    });
  });
});
