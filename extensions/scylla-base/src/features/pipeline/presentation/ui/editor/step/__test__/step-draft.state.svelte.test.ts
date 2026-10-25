import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { createStepDraft, type StepDraft } from '../step-draft.state.svelte.ts';

const scriptStep: PipelineStepEntity = {
  id: 'test',
  deps: ['build'],
  kind: 'script',
  shell: 'bash',
  script: 'npm test',
  env: [{ key: 'TOKEN', kind: 'secret', secretRef: 'npm-token' }],
};

const withDraft = (
  step: PipelineStepEntity,
  run: (draft: StepDraft, onChange: ReturnType<typeof vi.fn>) => void,
  onRename: (id: string) => string = id => id,
) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    const draft = createStepDraft({ step, onChange, onRename });
    flushSync();
    run(draft, onChange);
  });
  cleanup();
};

describe('createStepDraft', () => {
  it('starts from the step, without applying anything', () => {
    withDraft(scriptStep, (draft, onChange) => {
      expect(draft.value).toEqual({
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
    withDraft(scriptStep, (draft, onChange) => {
      draft.script = 'npm test -- --coverage';
      draft.workingDir = '  ./web ';

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ script: 'npm test -- --coverage', workingDir: './web' }),
      );
    });
  });

  it('applies an edit that leaves the step unable to run too, and says why', () => {
    withDraft(scriptStep, (draft, onChange) => {
      draft.mode = 'exec';

      expect(draft.issue).toBe('missing-command');
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'exec', command: '' }),
      );

      draft.command = ' cargo ';
      expect(draft.issue).toBeNull();
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'exec', command: 'cargo', args: [] }),
      );
    });
  });

  it('drops blank arguments and keyless variables from the applied step', () => {
    withDraft(
      { id: 'build', deps: [], kind: 'exec', command: 'cargo', args: [], env: [] },
      (draft, onChange) => {
        draft.addArg();
        draft.setArg(0, 'build');
        draft.addArg();
        draft.addEnv();
        draft.setEnv(1, { key: 'ignored' });
        draft.setEnv(0, { key: ' MODE ', value: 'release' });

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
    withDraft(scriptStep, draft => {
      draft.setEnv(0, { kind: 'literal', value: 'x' });
      draft.setEnv(0, { kind: 'secret' });

      expect(draft.value.env).toEqual([{ key: 'TOKEN', kind: 'secret', secretRef: 'npm-token' }]);
    });
  });

  it('removes an argument and a variable', () => {
    withDraft(
      {
        id: 'build',
        deps: [],
        kind: 'exec',
        command: 'cargo',
        args: ['a', 'b'],
        env: scriptStep.env,
      },
      (draft, onChange) => {
        draft.removeArg(0);
        draft.removeEnv(0);

        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ args: ['b'], env: [] }),
        );
      },
    );
  });

  it('keeps the id the pipeline gave on a rename, so a refused id does not stay typed', () => {
    const onRename = vi.fn((id: string) => (id.trim() ? `${id.trim()}_1` : 'test'));
    withDraft(
      scriptStep,
      draft => {
        draft.id = ' lint ';
        draft.rename();
        expect(draft.id).toBe('lint_1');

        draft.id = '  ';
        draft.rename();
        expect(draft.id).toBe('test');
      },
      onRename,
    );
  });

  it('checks the id as it is typed, and suggests the nearest valid one', () => {
    withDraft(scriptStep, draft => {
      expect(draft.idIssue).toBeNull();
      expect(draft.suggestedId).toBeNull();

      draft.id = 'Run Tests';
      flushSync();

      expect(draft.idIssue).toEqual({ kind: 'invalid-characters', characters: ['R', ' ', 'T'] });
      expect(draft.suggestedId).toBe('run-tests');
    });
  });
});
