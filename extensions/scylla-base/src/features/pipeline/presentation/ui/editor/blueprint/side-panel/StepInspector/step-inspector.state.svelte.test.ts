import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { createStepInspector, type StepInspector } from './step-inspector.state.svelte.ts';

const scriptStep: PipelineStep = {
  id: 'test',
  deps: ['build'],
  kind: 'script',
  shell: 'bash',
  script: 'npm test',
  env: [{ key: 'TOKEN', kind: 'secret', secretRef: 'npm-token' }],
};

const withInspector = (
  step: PipelineStep,
  run: (inspector: StepInspector, onChange: ReturnType<typeof vi.fn>) => void,
  onRename: (id: string) => string = id => id,
) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    const inspector = createStepInspector({ step, onChange, onRename });
    flushSync();
    run(inspector, onChange);
  });
  cleanup();
};

describe('createStepInspector', () => {
  it('starts from the step, without applying anything', () => {
    withInspector(scriptStep, (inspector, onChange) => {
      expect(inspector.value).toEqual({
        kind: 'script',
        shell: 'bash',
        script: 'npm test',
        workingDir: undefined,
        env: [{ key: 'TOKEN', kind: 'secret', secretRef: 'npm-token' }],
      });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('applies each edit at once', () => {
    withInspector(scriptStep, (inspector, onChange) => {
      inspector.script = 'npm test -- --coverage';
      inspector.workingDir = '  ./web ';

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ script: 'npm test -- --coverage', workingDir: './web' }),
      );
    });
  });

  it('applies an edit that leaves the step unable to run too, and says why', () => {
    withInspector(scriptStep, (inspector, onChange) => {
      inspector.mode = 'exec';

      expect(inspector.issue).toBe('missing-command');
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'exec', command: '' }),
      );

      inspector.command = ' cargo ';
      expect(inspector.issue).toBeNull();
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'exec', command: 'cargo', args: [] }),
      );
    });
  });

  it('drops blank arguments and keyless variables from the applied step', () => {
    withInspector(
      { id: 'build', deps: [], kind: 'exec', command: 'cargo', args: [], env: [] },
      (inspector, onChange) => {
        inspector.addArg();
        inspector.setArg(0, 'build');
        inspector.addArg();
        inspector.addEnv();
        inspector.setEnv(1, { key: 'ignored' });
        inspector.setEnv(0, { key: ' MODE ', value: 'release' });

        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({
            args: ['build'],
            env: [{ key: 'MODE', kind: 'literal', value: 'release' }],
          }),
        );
      },
    );
  });

  it('keeps a typed secret reference when the kind of a variable switches back', () => {
    withInspector(scriptStep, inspector => {
      inspector.setEnv(0, { kind: 'literal', value: 'x' });
      inspector.setEnv(0, { kind: 'secret' });

      expect(inspector.value.env).toEqual([
        { key: 'TOKEN', kind: 'secret', secretRef: 'npm-token' },
      ]);
    });
  });

  it('removes an argument and a variable', () => {
    withInspector(
      {
        id: 'build',
        deps: [],
        kind: 'exec',
        command: 'cargo',
        args: ['a', 'b'],
        env: scriptStep.env,
      },
      (inspector, onChange) => {
        inspector.removeArg(0);
        inspector.removeEnv(0);

        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ args: ['b'], env: [] }),
        );
      },
    );
  });

  it('keeps the id the pipeline gave on a rename, so a refused id does not stay typed', () => {
    const onRename = vi.fn((id: string) => (id.trim() ? `${id.trim()}_1` : 'test'));
    withInspector(
      scriptStep,
      inspector => {
        inspector.id = ' lint ';
        inspector.rename();
        expect(inspector.id).toBe('lint_1');

        inspector.id = '  ';
        inspector.rename();
        expect(inspector.id).toBe('test');
      },
      onRename,
    );
  });

  it('checks the id as it is typed, and suggests the nearest valid one', () => {
    withInspector(scriptStep, inspector => {
      expect(inspector.idIssue).toBeNull();
      expect(inspector.suggestedId).toBeNull();

      inspector.id = 'Run Tests';
      flushSync();

      expect(inspector.idIssue).toEqual({ kind: 'invalid-characters', characters: ['R', ' ', 'T'] });
      expect(inspector.suggestedId).toBe('run-tests');
    });
  });
});
