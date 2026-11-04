// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildTriggerDraft, triggerToDraftInputs } from '../trigger-form.mapper.ts';
import { isCronExpressionValid } from '@base/features/triggers/domain/structs/cron-expression.struct.ts';
import type { TriggerEntity } from '@base/features/triggers/domain/entities/trigger.entity.ts';

describe('triggerToDraftInputs', () => {
  it('flattens each input to its key/kind/value', () => {
    const trigger = {
      inputs: [
        { key: 'branch', value: { kind: 'literal', value: 'main' } },
        { key: 'sha', value: { kind: 'jsonPointer', value: '/head/sha' } },
      ],
    } as unknown as TriggerEntity;

    expect(triggerToDraftInputs(trigger)).toEqual([
      { key: 'branch', valueKind: 'literal', value: 'main' },
      { key: 'sha', valueKind: 'jsonPointer', value: '/head/sha' },
    ]);
  });

  it('returns an empty list for an undefined trigger', () => {
    expect(triggerToDraftInputs(undefined)).toEqual([]);
  });
});

describe('buildTriggerDraft', () => {
  it('trims the name and drops inputs with a blank key', () => {
    const draft = buildTriggerDraft({
      name: '  github-push  ',
      kind: 'webhook',
      cronExpression: '',
      signatureHeader: '  X-Hub-Signature  ',
      inputs: [
        { key: '  branch  ', valueKind: 'literal', value: 'main' },
        { key: '   ', valueKind: 'literal', value: 'dropped' },
      ],
    });

    expect(draft.name).toBe('github-push');
    expect(draft.inputs).toEqual([{ key: 'branch', value: { kind: 'literal', value: 'main' } }]);
    expect(draft.source).toEqual({ kind: 'webhook', signatureHeader: 'X-Hub-Signature' });
  });

  it('a jsonPointer input kind is only honored for a Webhook trigger', () => {
    const webhookDraft = buildTriggerDraft({
      name: 'x',
      kind: 'webhook',
      cronExpression: '',
      signatureHeader: '',
      inputs: [{ key: 'sha', valueKind: 'jsonPointer', value: '/head/sha' }],
    });
    expect(webhookDraft.inputs).toEqual([
      { key: 'sha', value: { kind: 'jsonPointer', value: '/head/sha' } },
    ]);

    const cronDraft = buildTriggerDraft({
      name: 'x',
      kind: 'cron',
      cronExpression: '0 0 * * *',
      signatureHeader: '',
      inputs: [{ key: 'sha', valueKind: 'jsonPointer', value: '/head/sha' }],
    });
    // A cron trigger has no payload: always literal.
    expect(cronDraft.inputs).toEqual([{ key: 'sha', value: { kind: 'literal', value: '/head/sha' } }]);
  });

  it('a Cron draft converts the expression (still a well-formed 5-field cron) and carries no signatureHeader', () => {
    const draft = buildTriggerDraft({
      name: 'nightly',
      kind: 'cron',
      cronExpression: ' 0 3 * * * ',
      signatureHeader: 'ignored-for-cron',
      inputs: [],
    });

    expect(draft.source.kind).toBe('cron');
    expect(draft.source).not.toHaveProperty('signatureHeader');
    if (draft.source.kind === 'cron') {
      expect(isCronExpressionValid(draft.source.expression)).toBe(true);
    }
  });
});
