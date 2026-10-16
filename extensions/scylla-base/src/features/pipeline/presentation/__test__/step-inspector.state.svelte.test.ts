import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import { createStepInspector, type StepInspector } from '../step-inspector.state.svelte.ts';

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
) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    const inspector = createStepInspector({ step, onChange });
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

  it('applies each edit that leaves the step runnable', () => {
    withInspector(scriptStep, (inspector, onChange) => {
      inspector.script = 'npm test -- --coverage';
      inspector.workingDir = '  ./web ';

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ script: 'npm test -- --coverage', workingDir: './web' }),
      );
    });
  });

  it('holds back an edit that leaves the step unable to run, and says why', () => {
    withInspector(scriptStep, (inspector, onChange) => {
      inspector.mode = 'exec';

      expect(inspector.issue).toBe('missing-command');
      expect(onChange).not.toHaveBeenCalled();

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
});
