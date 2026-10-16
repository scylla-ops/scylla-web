import { describe, it, expect, vi } from 'vitest';
import type { PipelineStep } from '../../../../../domain/structs/pipeline.struct.ts';
import { createStepNodeForm } from '../step-node-form.state.svelte.ts';

const inRoot = (run: () => void) => {
  const cleanup = $effect.root(run);
  cleanup();
};

describe('createStepNodeForm', () => {
  it('starts empty, in script mode, with sh', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      expect(form.nodeId).toBe('');
      expect(form.mode).toBe('script');
      expect(form.shell).toBe('sh');
      expect(form.toValue()).toBeNull();
    });
  });

  it('starts from the step it edits', () => {
    inRoot(() => {
      const form = createStepNodeForm({
        id: 'build',
        deps: [],
        kind: 'exec',
        command: 'cargo',
        args: ['build'],
        workingDir: 'crates',
        env: [
          { key: 'A', kind: 'literal', value: '1' },
          { key: 'B', kind: 'secret', secretRef: 'TOKEN' },
        ],
      });
      expect(form.mode).toBe('exec');
      expect(form.command).toBe('cargo');
      expect(form.args).toEqual(['build']);
      expect(form.envRows).toEqual([
        { key: 'A', kind: 'literal', value: '1', secretRef: '' },
        { key: 'B', kind: 'secret', value: '', secretRef: 'TOKEN' },
      ]);
    });
  });

  it('gives a script step, trimmed, without blank environment rows', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = '  build  ';
      form.script = 'make';
      form.shell = 'bash';
      form.workingDir = '  ';
      form.addEnv();
      form.addEnv();
      form.setEnv(0, { key: ' A ', value: '1' });

      expect(form.toValue()).toEqual({
        nodeId: 'build',
        value: {
          kind: 'script',
          script: 'make',
          shell: 'bash',
          workingDir: undefined,
          env: [{ key: 'A', kind: 'literal', value: '1' }],
        },
      });
    });
  });

  it('keeps a script step with an empty script: the canvas marks it, it does not drop it', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.script = '   ';
      expect(form.toValue()?.value).toMatchObject({ kind: 'script', script: '   ' });
    });
  });

  it('gives nothing without an id', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.script = 'make';
      expect(form.toValue()).toBeNull();
    });
  });

  it('gives an exec step without the blank arguments', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.mode = 'exec';
      form.command = ' cargo ';
      form.addArg();
      form.addArg();
      form.addArg();
      form.setArg(0, 'build');
      form.setArg(2, '--release');
      form.removeArg(1);
      form.workingDir = ' crates ';
      form.addEnv();
      form.setEnv(0, { key: 'TOKEN', kind: 'secret', secretRef: 'GH' });

      expect(form.toValue()).toEqual({
        nodeId: 'build',
        value: {
          kind: 'exec',
          command: 'cargo',
          args: ['build', '--release'],
          workingDir: 'crates',
          env: [{ key: 'TOKEN', kind: 'secret', secretRef: 'GH' }],
        },
      });
    });
  });

  it('keeps an exec step without a program yet', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.mode = 'exec';
      expect(form.toValue()?.value).toMatchObject({ kind: 'exec', command: '' });
    });
  });

  it('removes an environment row', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.addEnv();
      form.addEnv();
      form.setEnv(1, { key: 'KEEP' });
      form.removeEnv(0);
      expect(form.envRows.map(row => row.key)).toEqual(['KEEP']);
    });
  });

  describe('with onChange, as the step panel uses it', () => {
    const script = (id: string, body: string): PipelineStep => ({
      id,
      deps: [],
      kind: 'script',
      script: body,
      shell: 'sh',
      env: [],
    });

    it('sends each edit at once, under the id the step has', () => {
      inRoot(() => {
        const onChange = vi.fn();
        const form = createStepNodeForm(script('build', 'make'), { onChange });

        form.script = 'make all';
        form.shell = 'bash';

        expect(onChange).toHaveBeenLastCalledWith({
          nodeId: 'build',
          value: {
            kind: 'script',
            script: 'make all',
            shell: 'bash',
            workingDir: undefined,
            env: [],
          },
        });
      });
    });

    it('sends a new id only once it is committed, never each prefix typed', () => {
      inRoot(() => {
        const onChange = vi.fn();
        const form = createStepNodeForm(script('build', 'make'), { onChange });

        form.nodeId = 'com';
        form.nodeId = 'compile';
        expect(onChange).not.toHaveBeenCalled();

        form.commitId();
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.lastCall?.[0].nodeId).toBe('compile');
      });
    });

    it('ignores a blank id: the step keeps its name', () => {
      inRoot(() => {
        const onChange = vi.fn();
        const form = createStepNodeForm(script('build', 'make'), { onChange });

        form.nodeId = '   ';
        form.commitId();
        form.script = 'make all';

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.lastCall?.[0].nodeId).toBe('build');
      });
    });

    it('does not send the same step twice', () => {
      inRoot(() => {
        const onChange = vi.fn();
        const form = createStepNodeForm(script('build', 'make'), { onChange });

        form.script = 'make all';
        form.workingDir = '  ';
        form.addEnv();

        expect(onChange).toHaveBeenCalledOnce();
      });
    });
  });
});
