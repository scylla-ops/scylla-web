import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import {
  createPipelineScript,
  type PipelineScript,
} from '@base/features/pipeline/presentation/ui/editor/pipeline-script.state.svelte.ts';
import { createScriptingState, type ScriptingState } from '../scripting.state.svelte.ts';

const document = JSON.stringify({
  name: 'web',
  nodes: [
    { id: 'build', deps: [], kind: 'script', shell: 'bash', script: 'make', env: [] },
    { id: 'test', deps: ['build'], kind: 'exec', command: 'make', args: ['test'], env: [] },
  ],
});

const withScripting = (run: (scripting: ScriptingState, doc: PipelineScript) => void) => {
  const cleanup = $effect.root(() => {
    const doc = createPipelineScript({
      projectId: () => 'project-1',
      initialScript: () => document,
    });
    const scripting = createScriptingState({
      steps: () => doc.steps,
      isValid: () => doc.isValid,
      onStepsChange: steps => doc.setSteps(steps),
    });
    flushSync();
    run(scripting, doc);
  });
  cleanup();
};

const stepIn = (doc: PipelineScript, id: string) => doc.steps.find(step => step.id === id);

describe('createScriptingState', () => {
  it('shows the jobs one by one by default', () => {
    withScripting(scripting => {
      expect(scripting.mode).toBe('jobs');
      expect(scripting.focusedStep?.id).toBe('build');
    });
  });

  it('shows the full document while it does not parse', () => {
    withScripting((scripting, doc) => {
      doc.setScript('{ "nodes": [');
      flushSync();

      expect(scripting.canShowJobs).toBe(false);
      expect(scripting.mode).toBe('document');
    });
  });

  it('writes an edit of a job to the document', () => {
    withScripting((scripting, doc) => {
      const step = scripting.stepOf('build')!;
      scripting.draftOf(step).script = 'make all';
      flushSync();

      expect(stepIn(doc, 'build')).toMatchObject({ script: 'make all', deps: [] });
      expect(doc.script).toContain('make all');
    });
  });

  it('renames a job in the document, in the dependencies and in the open tabs', () => {
    withScripting((scripting, doc) => {
      const draft = scripting.draftOf(scripting.stepOf('build')!);
      draft.id = 'compile';
      draft.rename();
      flushSync();

      expect(doc.steps.map(step => step.id)).toEqual(['compile', 'test']);
      expect(stepIn(doc, 'test')?.deps).toEqual(['compile']);
      expect(scripting.panes.focusedJob).toBe('compile');

      // The renamed job keeps its draft: an edit after the rename still reaches the document.
      expect(scripting.draftOf(scripting.stepOf('compile')!)).toBe(draft);
      draft.script = 'make all';
      flushSync();
      expect(stepIn(doc, 'compile')).toMatchObject({ script: 'make all' });
    });
  });

  it('adds a job after the focused one, and opens it', () => {
    withScripting((scripting, doc) => {
      scripting.add();
      flushSync();

      expect(stepIn(doc, 'job')).toMatchObject({ deps: ['build'], kind: 'script', shell: 'bash' });
      expect(scripting.panes.focusedJob).toBe('job');
    });
  });

  it('removes a job and the dependencies on it', () => {
    withScripting((scripting, doc) => {
      scripting.remove('build');
      flushSync();

      expect(doc.steps.map(step => step.id)).toEqual(['test']);
      expect(stepIn(doc, 'test')?.deps).toEqual([]);
    });
  });

  it('offers as dependencies only the jobs that do not wait for the job', () => {
    withScripting(scripting => {
      expect(scripting.dependencyCandidates('build')).toEqual([]);
      expect(scripting.dependencyCandidates('test')).toEqual(['build']);
      expect(scripting.dependentsOf('build')).toEqual(['test']);
    });
  });
});
