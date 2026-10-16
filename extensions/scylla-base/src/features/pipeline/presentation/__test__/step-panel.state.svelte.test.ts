import { describe, it, expect, vi } from 'vitest';
import type { PipelineStep } from '../../domain/structs/pipeline.struct.ts';
import { createStepPanelState, type StepChange } from '../step-panel.state.svelte.ts';

const script = (id: string, body: string): PipelineStep => ({
  id,
  deps: [],
  kind: 'script',
  script: body,
  shell: 'sh',
  env: [],
});

/** The panel over `step`, and the changes it has sent. */
const panelOf = (
  step: PipelineStep,
  run: (panel: ReturnType<typeof createStepPanelState>, sent: () => StepChange | undefined) => void,
) => {
  const onChange = vi.fn<(change: StepChange) => void>();
  const cleanup = $effect.root(() => {
    run(createStepPanelState(step, onChange), () => onChange.mock.lastCall?.[0]);
  });
  cleanup();
  return onChange;
};

describe('createStepPanelState', () => {
  it('starts from the step it edits', () => {
    panelOf(
      {
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
      },
      panel => {
        expect(panel.nodeId).toBe('build');
        expect(panel.mode).toBe('exec');
        expect(panel.command).toBe('cargo');
        expect(panel.args).toEqual(['build']);
        expect(panel.workingDir).toBe('crates');
        expect(panel.envRows).toEqual([
          { key: 'A', kind: 'literal', value: '1', secretRef: '' },
          { key: 'B', kind: 'secret', value: '', secretRef: 'TOKEN' },
        ]);
      },
    );
  });

  it('sends each edit at once, under the id the step has', () => {
    panelOf(script('build', 'make'), (panel, sent) => {
      panel.script = 'make all';
      panel.shell = 'bash';

      expect(sent()).toEqual({
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

  it('keeps a script that is still empty: the canvas marks the step, it does not drop it', () => {
    panelOf(script('build', 'make'), (panel, sent) => {
      panel.script = '   ';
      expect(sent()?.value).toMatchObject({ kind: 'script', script: '   ' });
    });
  });

  it('sends a trimmed command, without blank arguments, directory or variables', () => {
    panelOf(script('build', 'make'), (panel, sent) => {
      panel.mode = 'exec';
      panel.command = ' cargo ';
      panel.addArg();
      panel.addArg();
      panel.addArg();
      panel.setArg(0, 'build');
      panel.setArg(2, '--release');
      panel.removeArg(1);
      panel.workingDir = ' crates ';
      panel.addEnv();
      panel.addEnv();
      panel.setEnv(0, { key: ' TOKEN ', kind: 'secret', secretRef: 'GH' });

      expect(sent()).toEqual({
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

  it('keeps what was typed in the other type, so switching back loses nothing', () => {
    panelOf(script('build', 'make'), (panel, sent) => {
      panel.mode = 'exec';
      panel.mode = 'script';
      expect(sent()?.value).toMatchObject({ kind: 'script', script: 'make' });
    });
  });

  it('sends a new id only once it is committed, never each prefix typed', () => {
    const onChange = panelOf(script('build', 'make'), (panel, sent) => {
      panel.nodeId = 'com';
      panel.nodeId = 'compile';
      expect(sent()).toBeUndefined();

      panel.commitId();
      expect(sent()?.nodeId).toBe('compile');
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('ignores a blank id: the step keeps its name', () => {
    panelOf(script('build', 'make'), (panel, sent) => {
      panel.nodeId = '   ';
      panel.commitId();
      expect(sent()).toBeUndefined();

      panel.script = 'make all';
      expect(sent()?.nodeId).toBe('build');
    });
  });

  it('removes an environment row', () => {
    panelOf(script('build', 'make'), panel => {
      panel.addEnv();
      panel.addEnv();
      panel.setEnv(1, { key: 'KEEP' });
      panel.removeEnv(0);
      expect(panel.envRows.map(row => row.key)).toEqual(['KEEP']);
    });
  });
});
