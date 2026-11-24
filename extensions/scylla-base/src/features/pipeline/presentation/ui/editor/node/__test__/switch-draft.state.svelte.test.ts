import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { SwitchPipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { createNodeDraft, type NodeDraft } from '../node-draft.state.svelte.ts';

const ifNode: SwitchPipelineNodeEntity = {
  id: 'is-main',
  deps: [],
  env: [{ key: 'TARGET', kind: 'literal', value: 'main' }],
  kind: 'switch',
  cases: [
    {
      port: 'true',
      combinator: 'all',
      rules: [
        {
          left: { kind: 'var', name: 'SCYLLA_BRANCH' },
          test: 'equals',
          right: { kind: 'var', name: 'TARGET' },
        },
      ],
    },
  ],
  otherwise: 'false',
  allMatches: false,
};

const withDraft = (run: (draft: NodeDraft, onChange: ReturnType<typeof vi.fn>) => void) => {
  const onChange = vi.fn();
  const cleanup = $effect.root(() => {
    const draft = createNodeDraft({ node: ifNode, onChange, onRename: id => id });
    flushSync();
    run(draft, onChange);
  });
  cleanup();
};

const lastValue = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.lastCall?.[0] as SwitchPipelineNodeEntity;

describe('the switch of a node draft', () => {
  it('starts from the switch, with its env, without applying anything', () => {
    withDraft((draft, onChange) => {
      expect(draft.value).toEqual({
        env: ifNode.env,
        kind: 'switch',
        cases: ifNode.cases,
        otherwise: 'false',
        allMatches: false,
      });
      expect(draft.issue).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('adds a case with a free port and one empty rule, and moves it up', () => {
    withDraft((draft, onChange) => {
      draft.switch.addCase();
      expect(lastValue(onChange).cases.map(c => c.port)).toEqual(['true', 'case-2']);

      draft.switch.moveCase(1, -1);
      expect(lastValue(onChange).cases.map(c => c.port)).toEqual(['case-2', 'true']);
      expect(lastValue(onChange).cases[0].rules).toHaveLength(1);
    });
  });

  it('says which port a rename changes, and gives a taken name a suffix', () => {
    withDraft((draft, onChange) => {
      draft.switch.renameCase(0, ' yes ');
      expect(onChange).toHaveBeenLastCalledWith(expect.anything(), { from: 'true', to: 'yes' });

      draft.switch.renameCase(0, 'false');
      expect(onChange).toHaveBeenLastCalledWith(expect.anything(), {
        from: 'yes',
        to: 'false_1',
      });

      const calls = onChange.mock.calls.length;
      draft.switch.renameCase(0, '  ');
      draft.switch.renameCase(0, ' error ');
      draft.switch.renameOtherwise('error');
      expect(onChange).toHaveBeenCalledTimes(calls);
      expect(draft.switch.cases[0].port).toBe('false_1');
      expect(draft.switch.otherwise).toBe('false');
    });
  });

  it('says which port goes when a case or otherwise is removed', () => {
    withDraft((draft, onChange) => {
      draft.switch.setOtherwise(false);
      expect(onChange).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ otherwise: expect.anything() }),
        { from: 'false', to: null },
      );

      draft.switch.removeCase(0);
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ cases: [] }), {
        from: 'true',
        to: null,
      });
    });
  });

  it('turns otherwise on with a free port, and renames it', () => {
    withDraft((draft, onChange) => {
      draft.switch.setOtherwise(false);
      draft.switch.setOtherwise(true);
      expect(lastValue(onChange).otherwise).toBe('otherwise');

      draft.switch.renameOtherwise('else');
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ otherwise: 'else' }), {
        from: 'otherwise',
        to: 'else',
      });
    });
  });

  it('drops the right value for empty and not_empty, and gives it back for another test', () => {
    withDraft((draft, onChange) => {
      draft.switch.setTest(0, 0, 'not_empty');
      expect(lastValue(onChange).cases[0].rules[0]).toEqual({
        left: { kind: 'var', name: 'SCYLLA_BRANCH' },
        test: 'not_empty',
      });

      draft.switch.setTest(0, 0, 'number_gt');
      expect(lastValue(onChange).cases[0].rules[0].right).toEqual({ kind: 'literal', value: '' });
    });
  });

  it('edits the operands, the rules, the combinator and allMatches', () => {
    withDraft((draft, onChange) => {
      draft.switch.setOperand(0, 0, 'left', { kind: 'output', node: 'build', key: 'TAG' });
      draft.switch.addRule(0);
      draft.switch.removeRule(0, 1);
      draft.switch.setCombinator(0, 'any');
      draft.switch.allMatches = true;

      expect(lastValue(onChange)).toMatchObject({
        allMatches: true,
        cases: [
          {
            combinator: 'any',
            rules: [{ left: { kind: 'output', node: 'build', key: 'TAG' } }],
          },
        ],
      });
    });
  });
});
