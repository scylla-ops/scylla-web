import type {
  TriggerDraft,
  TriggerEntity,
  TriggerDraftKind,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';

import { convertCronToUTC } from './cron-timezone.mapper.ts';

export interface DraftInput {
  key: string;
  valueKind: 'literal' | 'jsonPointer';
  value: string;
}

export const triggerToDraftInputs = (trigger?: TriggerEntity): DraftInput[] =>
  (trigger?.inputs ?? []).map(input => ({
    key: input.key,
    valueKind: input.value.kind,
    value: input.value.value,
  }));

export const buildTriggerDraft = (params: {
  name: string;
  kind: TriggerDraftKind;
  cronExpression: string;
  signatureHeader: string;
  inputs: DraftInput[];
}): TriggerDraft => {
  const allowPointer = params.kind === 'webhook';

  const inputs = params.inputs
    .filter(input => input.key.trim().length > 0)
    .map(input =>
      allowPointer && input.valueKind === 'jsonPointer'
        ? { key: input.key.trim(), value: { kind: 'jsonPointer', value: input.value } as const }
        : { key: input.key.trim(), value: { kind: 'literal', value: input.value } as const },
    );

  let finalCronExpression = params.cronExpression.trim();

  if (params.kind === 'cron') {
    finalCronExpression = convertCronToUTC(finalCronExpression);
  }

  return {
    name: params.name.trim(),
    source:
      params.kind === 'cron'
        ? { kind: 'cron', expression: finalCronExpression }
        : { kind: 'webhook', signatureHeader: params.signatureHeader.trim() },
    inputs,
  };
};
