import { describe, it, expect } from 'vitest';
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
          retries: 0,
        },
      });
    });
  });

  it('refuses a script step with an empty script', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.script = '   ';
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
          retries: 0,
        },
      });
    });
  });

  it('refuses an exec step without a command', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.mode = 'exec';
      expect(form.toValue()).toBeNull();
    });
  });

  it('starts from the timeout and the retries of the step it edits', () => {
    inRoot(() => {
      const form = createStepNodeForm({
        id: 'build',
        deps: [],
        kind: 'script',
        script: 'make',
        shell: 'sh',
        env: [],
        timeoutSeconds: 30,
        retries: 2,
      });
      expect(form.timeoutSeconds).toBe('30');
      expect(form.retries).toBe('2');
      expect(form.toValue()?.value).toMatchObject({ timeoutSeconds: 30, retries: 2 });
    });
  });

  it('gives no timeout for an empty field', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.script = 'make';
      form.timeoutSeconds = '  ';
      expect(form.timeoutInvalid).toBe(false);
      expect(form.toValue()?.value.timeoutSeconds).toBeUndefined();
    });
  });

  it.each(['0', '604801', '1.5', '-1', 'abc'])('refuses the timeout %s', raw => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.script = 'make';
      form.timeoutSeconds = raw;
      expect(form.timeoutInvalid).toBe(true);
      expect(form.toValue()).toBeNull();
    });
  });

  it.each(['11', '-1', '2.5'])('refuses the retries %s', raw => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.script = 'make';
      form.retries = raw;
      expect(form.retriesInvalid).toBe(true);
      expect(form.toValue()).toBeNull();
    });
  });

  it('accepts the bounds of each range', () => {
    inRoot(() => {
      const form = createStepNodeForm();
      form.nodeId = 'build';
      form.script = 'make';
      form.timeoutSeconds = '604800';
      form.retries = '10';
      expect(form.toValue()?.value).toMatchObject({ timeoutSeconds: 604800, retries: 10 });
      form.timeoutSeconds = '1';
      form.retries = '0';
      expect(form.toValue()?.value).toMatchObject({ timeoutSeconds: 1, retries: 0 });
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
});
