import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { createNodeDraft, type NodeDraft } from '../node-draft.state.svelte.ts';

const scriptNode: PipelineNodeEntity = {
  id: 'test',
  deps: ['build'],
  kind: 'script',
  shell: 'bash',
  script: 'npm test',
  env: [{ key: 'TOKEN', kind: 'secret', secretRef: 'npm-token' }],
};

const withDraft = (
  node: PipelineNodeEntity,
  run: (draft: NodeDraft, onChange: ReturnType<typeof vi.fn>) => void,
  onRename: (id: string) => string = id => id,
) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    const draft = createNodeDraft({ node, onChange, onRename });
    flushSync();
    run(draft, onChange);
  });
  cleanup();
};

describe('createNodeDraft', () => {
  it('starts from the node, without applying anything', () => {
    withDraft(scriptNode, (draft, onChange) => {
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
    withDraft(scriptNode, (draft, onChange) => {
      draft.script = 'npm test -- --coverage';
      draft.workingDir = '  ./web ';

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ script: 'npm test -- --coverage', workingDir: './web' }),
      );
    });
  });

  it('applies an edit that leaves the node unable to run too, and says why', () => {
    withDraft(scriptNode, (draft, onChange) => {
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

  it('drops blank arguments and keyless variables from the applied node', () => {
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
    withDraft(scriptNode, draft => {
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
        env: scriptNode.env,
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
      scriptNode,
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
    withDraft(scriptNode, draft => {
      expect(draft.idIssue).toBeNull();
      expect(draft.suggestedId).toBeNull();

      draft.id = 'Run Tests';
      flushSync();

      expect(draft.idIssue).toEqual({ kind: 'invalid-characters', characters: ['R', ' ', 'T'] });
      expect(draft.suggestedId).toBe('run-tests');
    });
  });

  it('starts from the timeout and the retries of the node', () => {
    withDraft({ ...scriptNode, timeoutSeconds: 30, retries: 2 }, draft => {
      expect(draft.timeoutSeconds).toBe('30');
      expect(draft.retries).toBe('2');
      expect(draft.value).toMatchObject({ timeoutSeconds: 30, retries: 2 });
    });
  });

  it('applies a timeout and retries in range, and none for an empty timeout or 0 retries', () => {
    withDraft({ ...scriptNode, timeoutSeconds: 30, retries: 2 }, (draft, onChange) => {
      draft.timeoutSeconds = '604800';
      draft.retries = '10';
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ timeoutSeconds: 604800, retries: 10 }),
      );

      draft.timeoutSeconds = '  ';
      draft.retries = '0';
      expect(draft.timeoutInvalid).toBe(false);
      expect(onChange.mock.lastCall?.[0]).toMatchObject({
        timeoutSeconds: undefined,
        retries: undefined,
      });
    });
  });

  it.each(['0', '604801', '1.5', '-1', 'abc'])(
    'shows the timeout %s as out of range and keeps the last one in range',
    raw => {
      withDraft({ ...scriptNode, timeoutSeconds: 30 }, (draft, onChange) => {
        draft.timeoutSeconds = raw;
        flushSync();

        expect(draft.timeoutInvalid).toBe(true);
        expect(onChange).not.toHaveBeenCalled();
        expect(draft.value.timeoutSeconds).toBe(30);
      });
    },
  );

  it.each(['11', '-1', '2.5'])(
    'shows the retries %s as out of range and keeps the last one in range',
    raw => {
      withDraft({ ...scriptNode, retries: 2 }, (draft, onChange) => {
        draft.retries = raw;
        flushSync();

        expect(draft.retriesInvalid).toBe(true);
        expect(onChange).not.toHaveBeenCalled();
        expect(draft.value.retries).toBe(2);
      });
    },
  );
});
