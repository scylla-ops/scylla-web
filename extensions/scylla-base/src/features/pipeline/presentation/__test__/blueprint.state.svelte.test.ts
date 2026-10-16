import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { ExecPipelineStep, PipelineStep } from '../../domain/structs/pipeline.struct.ts';
import { createBlueprintState } from '../blueprint.state.svelte.ts';
import { START_NODE_ID, flowToSteps } from '../utils/blueprint-converter.ts';
import { stepsOf, withSteps } from '../utils/pipeline-script.ts';

const execStep = (id: string, deps: string[] = []): ExecPipelineStep => ({
  id,
  deps,
  kind: 'exec',
  command: 'echo',
  args: [id],
  env: [],
});

const withState = (
  initial: PipelineStep[],
  run: (
    state: ReturnType<typeof createBlueprintState>,
    onStepsChange: ReturnType<typeof vi.fn>,
  ) => void,
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

/** The document round trip: steps go into the script and are read back from it. */
const throughScript = (steps: PipelineStep[]) => stepsOf(JSON.parse(withSteps(null, steps, 'p')));

const withLiveState = (
  run: (
    state: ReturnType<typeof createBlueprintState>,
    document: { steps: PipelineStep[]; name: string },
  ) => void,
) => {
  const document = $state<{ steps: PipelineStep[]; name: string }>({
    steps: [execStep('build')],
    name: 'nightly',
  });
  const cleanup = $effect.root(() => {
    const state = createBlueprintState({
      steps: () => document.steps,
      pipelineName: () => document.name,
      onStepsChange: steps => (document.steps = throughScript(steps)),
    });
    flushSync();
    run(state, document);
  });
  cleanup();
};

describe('createBlueprintState', () => {
  it('keeps the layout when only the pipeline is renamed', () => {
    withLiveState((state, document) => {
      state.nodes = state.nodes.map(node =>
        node.id === 'build' ? { ...node, position: { x: 999, y: 999 } } : node,
      );
      const revision = state.revision;

      document.name = 'weekly';
      flushSync();

      expect(state.revision).toBe(revision);
      expect(state.nodes.find(node => node.id === 'build')?.position).toEqual({ x: 999, y: 999 });
      expect(state.nodes.find(node => node.id === START_NODE_ID)?.data).toEqual({ name: 'weekly' });
    });
  });

  it('does not rebuild on the echo of its own edit, though the script writes an empty directory', () => {
    withLiveState(state => {
      const revision = state.revision;

      state.updateStep('build', 'build', { kind: 'exec', command: 'make', args: [], env: [] });
      flushSync();

      expect(state.revision).toBe(revision);
    });
  });

  it('rebuilds the graph, and counts it, when the script changes the steps', () => {
    withLiveState((state, document) => {
      const revision = state.revision;

      document.steps = [execStep('build'), execStep('deploy', ['build'])];
      flushSync();

      expect(state.revision).toBe(revision + 1);
      expect(state.nodes.map(node => node.id)).toContain('deploy');
    });
  });

  it('builds the graph from the steps, with the start node', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      expect(state.nodes.map(node => node.id).sort()).toEqual(
        [START_NODE_ID, 'build', 'test'].sort(),
      );
      expect(state.edges.some(edge => edge.source === 'build' && edge.target === 'test')).toBe(
        true,
      );
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

  it('adds a step with a unique id, publishes it and selects it', () => {
    withState([execStep('build')], (state, onStepsChange) => {
      const id = state.addStep('build', { kind: 'exec', command: 'make', args: [], env: [] });

      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(id).toBe('build_1');
      expect(published.map(step => step.id)).toEqual(['build', 'build_1']);
      expect(state.selectedId).toBe('build_1');
      expect(state.nodes.find(node => node.id === 'build_1')?.selected).toBe(true);
    });
  });

  it('runs a step dropped on another one after it, and off the start node otherwise', () => {
    withState([execStep('build')], (state, onStepsChange) => {
      state.addStep(
        'test',
        { kind: 'exec', command: 'make', args: ['test'], env: [] },
        { after: 'build' },
      );
      state.addStep('lint', { kind: 'exec', command: 'lint', args: [], env: [] });

      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.find(step => step.id === 'test')?.deps).toEqual(['build']);
      expect(published.find(step => step.id === 'lint')?.deps).toEqual([]);
      expect(
        state.edges.some(edge => edge.source === START_NODE_ID && edge.target === 'lint'),
      ).toBe(true);
      expect(
        state.edges.some(edge => edge.source === START_NODE_ID && edge.target === 'test'),
      ).toBe(false);
    });
  });

  it('places a new step beside the one it runs after, on a free row', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      const build = state.nodes.find(node => node.id === 'build')!;
      const test = state.nodes.find(node => node.id === 'test')!;
      state.addStep(
        'lint',
        { kind: 'exec', command: 'lint', args: [], env: [] },
        { after: 'build' },
      );

      const lint = state.nodes.find(node => node.id === 'lint')!;
      expect(lint.position.x).toBe(test.position.x);
      expect(lint.position.y).toBeGreaterThan(build.position.y);
    });
  });

  it('removes a step with its links, and roots the steps that ran after it', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      state.select('build');
      state.removeStep('build');

      expect(onStepsChange).toHaveBeenLastCalledWith([execStep('test')]);
      expect(state.selectedId).toBeNull();
      expect(
        state.edges.some(edge => edge.source === START_NODE_ID && edge.target === 'test'),
      ).toBe(true);
    });
  });

  it('adds and removes a dependency from the panel', () => {
    withState([execStep('build'), execStep('test')], (state, onStepsChange) => {
      state.addDependency('test', 'build');
      expect(
        (onStepsChange.mock.lastCall?.[0] as PipelineStep[]).find(step => step.id === 'test')?.deps,
      ).toEqual(['build']);

      state.removeDependency('test', 'build');
      expect(
        (onStepsChange.mock.lastCall?.[0] as PipelineStep[]).find(step => step.id === 'test')?.deps,
      ).toEqual([]);
    });
  });

  it('refuses a dependency that would make a cycle, from the panel and from the canvas', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      expect(state.dependencyCandidates('build')).toEqual([]);
      expect(state.dependencyCandidates('test')).toEqual([]);
      expect(state.canConnect({ source: 'test', target: 'build' } as never)).toBe(false);
      expect(state.canConnect({ source: 'build', target: 'build' } as never)).toBe(false);

      const calls = onStepsChange.mock.calls.length;
      state.addDependency('build', 'test');
      expect(onStepsChange.mock.calls.length).toBe(calls);
    });
  });

  it('gives the selected step with the dependencies drawn on the canvas', () => {
    withState([execStep('build'), execStep('test', ['build'])], state => {
      state.select('test');
      expect(state.selectedStep).toMatchObject({ id: 'test', deps: ['build'] });

      state.select(START_NODE_ID);
      expect(state.selectedStep).toBeUndefined();
      expect(state.selectedId).toBe(START_NODE_ID);
    });
  });

  it('renames a step everywhere its id is written, and keeps it selected', () => {
    withState([execStep('build'), execStep('test', ['build'])], (state, onStepsChange) => {
      state.select('build');
      const id = state.updateStep('build', 'compile', {
        kind: 'exec',
        command: 'make',
        args: [],
        env: [],
      });

      expect(id).toBe('compile');
      expect(state.selectedId).toBe('compile');

      const published = onStepsChange.mock.lastCall?.[0] as PipelineStep[];
      expect(published.find(step => step.id === 'compile')).toMatchObject({ command: 'make' });
      expect(published.find(step => step.id === 'test')?.deps).toEqual(['compile']);
      expect(state.edges.some(edge => edge.source === 'compile' && edge.target === 'test')).toBe(
        true,
      );
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
});
