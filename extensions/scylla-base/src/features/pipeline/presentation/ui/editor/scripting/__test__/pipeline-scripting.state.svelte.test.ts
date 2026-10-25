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
      steps: () => doc.steps,
      isValid: () => doc.isValid,
      onStepsChange: steps => doc.setSteps(steps),
    });
    flushSync();
    run(scripting, doc);
  });
  cleanup();
};

const stepIn = (doc: PipelineDocument, id: string) => doc.steps.find(step => step.id === id);

describe('createPipelineScripting', () => {
  it('shows the steps one by one by default', () => {
    withScripting(scripting => {
      expect(scripting.mode).toBe('steps');
      expect(scripting.focusedStep?.id).toBe('build');
    });
  });

  it('shows the full document while it does not parse', () => {
    withScripting((scripting, doc) => {
      doc.setScript('{ "nodes": [');
      flushSync();

      expect(scripting.canShowSteps).toBe(false);
      expect(scripting.mode).toBe('document');
    });
  });

  it.each([
    ['two steps share an id', [{ id: 'a' }, { id: 'a' }]],
    ['a step lists a dependency twice', [{ id: 'a' }, { id: 'b', deps: ['a', 'a'] }]],
  ])('shows the full document, not the steps, when %s', (_, nodes) => {
    withScripting(
      scripting => {
        expect(scripting.canShowSteps).toBe(false);
        expect(scripting.mode).toBe('document');
      },
      JSON.stringify({ name: 'web', nodes }),
    );
  });

  it('writes an edit of a step to the document', () => {
    withScripting((scripting, doc) => {
      const step = scripting.stepOf('build')!;
      scripting.draftOf(step).script = 'make all';
      flushSync();

      expect(stepIn(doc, 'build')).toMatchObject({ script: 'make all', deps: [] });
      expect(doc.script).toContain('make all');
    });
  });

  it('renames a step in the document, in the dependencies and in the open tabs', () => {
    withScripting((scripting, doc) => {
      const draft = scripting.draftOf(scripting.stepOf('build')!);
      draft.id = 'compile';
      draft.rename();
      flushSync();

      expect(doc.steps.map(step => step.id)).toEqual(['compile', 'test']);
      expect(stepIn(doc, 'test')?.deps).toEqual(['compile']);
      expect(scripting.panes.focusedId).toBe('compile');

      // The renamed step keeps its draft: an edit after the rename still reaches the document.
      expect(scripting.draftOf(scripting.stepOf('compile')!)).toBe(draft);
      draft.script = 'make all';
      flushSync();
      expect(stepIn(doc, 'compile')).toMatchObject({ script: 'make all' });
    });
  });

  it('adds a step after the focused one, and opens it', () => {
    withScripting((scripting, doc) => {
      scripting.add();
      flushSync();

      expect(stepIn(doc, 'step')).toMatchObject({ deps: ['build'], kind: 'script', shell: 'bash' });
      expect(scripting.panes.focusedId).toBe('step');
    });
  });

  it('removes a step and the dependencies on it', () => {
    withScripting((scripting, doc) => {
      scripting.remove('build');
      flushSync();

      expect(doc.steps.map(step => step.id)).toEqual(['test']);
      expect(stepIn(doc, 'test')?.deps).toEqual([]);
    });
  });

  it('offers as dependencies only the steps that do not wait for the step', () => {
    withScripting(scripting => {
      expect(scripting.dependencyCandidates('build')).toEqual([]);
      expect(scripting.dependencyCandidates('test')).toEqual(['build']);
      expect(scripting.dependentsOf('build')).toEqual(['test']);
    });
  });

  describe('moveStep', () => {
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

    it('makes a step wait only for the step it is dropped on, and offers to undo', () => {
      withScripting((scripting, doc) => {
        scripting.moveStep('test', 'build', false);
        flushSync();

        expect(stepIn(doc, 'test')?.deps).toEqual(['build']);
        expect(toast).toHaveBeenCalledOnce();

        undo();
        flushSync();
        expect(stepIn(doc, 'test')?.deps).toEqual(['build', 'lint']);
      }, graph);
    });

    it('keeps the other dependencies with keep, and says nothing', () => {
      withScripting((scripting, doc) => {
        scripting.moveStep('deploy', 'lint', true);
        flushSync();

        expect(stepIn(doc, 'deploy')?.deps).toEqual(['test', 'lint']);
        expect(toast).not.toHaveBeenCalled();
      }, graph);
    });

    it('makes a step run first when dropped on no step', () => {
      withScripting((scripting, doc) => {
        scripting.moveStep('deploy', null, false);
        flushSync();

        expect(stepIn(doc, 'deploy')?.deps).toEqual([]);
      }, graph);
    });

    it('rearranges the dependencies when a step is dropped on a step that waits for it', () => {
      withScripting((scripting, doc) => {
        scripting.moveStep('test', 'deploy', false);
        flushSync();

        expect(stepIn(doc, 'deploy')?.deps).toEqual(['build', 'lint']);
        expect(stepIn(doc, 'test')?.deps).toEqual(['deploy']);
        expect(toast).toHaveBeenCalledOnce();

        undo();
        flushSync();
        expect(stepIn(doc, 'test')?.deps).toEqual(['build', 'lint']);
        expect(stepIn(doc, 'deploy')?.deps).toEqual(['test']);
      }, graph);
    });

    it('does not restore on undo a dependency that now makes a loop', () => {
      withScripting((scripting, doc) => {
        scripting.moveStep('test', null, false);
        scripting.moveStep('lint', 'test', false);
        flushSync();

        undo();
        flushSync();
        expect(stepIn(doc, 'test')?.deps).toEqual(['build']);
      }, graph);
    });
  });
});
