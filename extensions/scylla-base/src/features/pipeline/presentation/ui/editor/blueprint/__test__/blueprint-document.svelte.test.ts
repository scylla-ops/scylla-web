import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createBlueprintState } from '../blueprint.state.svelte.ts';
import { createPipelineDocument } from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';

const SCRIPT = JSON.stringify({
  name: 'nightly',
  nodes: [
    { id: 'build', deps: [], workingDir: '', env: [], kind: 'script', shell: 'bash', script: 'make' },
  ],
});

/** The blueprint wired to the editor's document, as `PipelineEditor` wires them. */
const withEditor = (run: (state: ReturnType<typeof createBlueprintState>) => void) => {
  const cleanup = $effect.root(() => {
    const doc = createPipelineDocument({ projectId: () => 'p', initialScript: () => SCRIPT });
    flushSync();
    const state = createBlueprintState({
      steps: () => doc.steps,
      pipelineName: () => doc.pipelineName,
      onStepsChange: steps => doc.setSteps(steps),
    });
    flushSync();
    run(state);
  });
  cleanup();
};

describe('the blueprint over the document', () => {
  it('keeps the side panel open while the inspected step is edited', () => {
    withEditor(state => {
      state.inspect('build');
      state.updateStep('build', { kind: 'script', shell: 'sh', script: 'make all', env: [] });
      flushSync();
      state.updateStep('build', { kind: 'exec', command: 'make', args: [], env: [] });
      flushSync();

      expect(state.inspected?.id).toBe('build');
    });
  });

  it('keeps a dropped step where it was dropped', () => {
    withEditor(state => {
      state.addNode('lint', { kind: 'exec', command: 'eslint', args: [], workingDir: '', env: [] }, {
        position: { x: 640, y: 480 },
      });
      flushSync();

      expect(state.nodes.find(node => node.id === 'lint')?.position).toEqual({ x: 640, y: 480 });
    });
  });
});
