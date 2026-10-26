import type {
  CreateTriggerRequest,
  CreateTriggerResponse,
  FireObservation,
  Trigger as ProtoTrigger,
  TriggerInput as ProtoTriggerInput,
  UpdateTriggerRequest,
} from '@base/generated/scylla/trigger/v1/trigger.ts';
import type {
  CreatedTrigger,
  TriggerDraft,
  TriggerEntity,
  TriggerFireResult,
  TriggerInput,
  TriggerSource,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import { TriggerKind } from '@base/features/triggers/domain/entities/trigger.entity.ts';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
  wrapId,
} from '@shared/infrastructure/grpc/wrappers.ts';
import { ScyllaError } from '@shared/utils/scylla-result.ts';

function sourceToDomain(source: ProtoTrigger['source']): TriggerSource {
  switch (source.oneofKind) {
    case 'cron':
      return { kind: TriggerKind.Cron, expression: source.cron.expression };
    case 'webhook':
      return {
        kind: TriggerKind.Webhook,
        signatureHeader: source.webhook.signatureHeader,
        webhookUrl: source.webhook.url,
      };
    default:
      // A source arm newer than this build: unknown.
      return { kind: TriggerKind.Unknown };
  }
}

function observationToDomain(observation?: FireObservation): TriggerFireResult | undefined {
  if (!observation) return undefined;
  switch (observation.result.oneofKind) {
    case 'succeeded':
      return { kind: 'succeeded' };
    case 'failed':
      return { kind: 'failed', error: observation.result.failed.error };
    default:
      // An outcome arm newer than this build: neither success nor failure.
      return { kind: 'unknown' };
  }
}

function inputToDomain(input: ProtoTriggerInput): TriggerInput {
  switch (input.source.oneofKind) {
    case 'literal':
      return { key: input.key, value: { kind: 'literal', value: input.source.literal } };
    case 'jsonPointer':
      return { key: input.key, value: { kind: 'jsonPointer', value: input.source.jsonPointer } };
    default:
      return { key: input.key, value: { kind: 'literal', value: '' } };
  }
}

export function toDomain(trigger: ProtoTrigger): TriggerEntity {
  // A disabled trigger has no due time.
  const nextFireAt =
    trigger.activation.oneofKind === 'enabled'
      ? timestampToIsoOpt(trigger.activation.enabled.nextFireAt)
      : undefined;
  return {
    id: idValue(trigger.triggerId),
    pipelineId: idValue(trigger.pipelineId),
    name: trigger.name,
    source: sourceToDomain(trigger.source),
    inputs: trigger.inputs.map(inputToDomain),
    enabled: trigger.activation.oneofKind === 'enabled',
    nextFireAt,
    lastFiredAt: timestampToIsoOpt(trigger.lastObservation?.firedAt),
    lastResult: observationToDomain(trigger.lastObservation),
    createdAt: timestampToIso(trigger.createdAt),
    updatedAt: timestampToIso(trigger.updatedAt),
  };
}

export function toDomainList(triggers: ProtoTrigger[]): TriggerEntity[] {
  return triggers.map(toDomain);
}

export function createdToDomain(response: CreateTriggerResponse): CreatedTrigger {
  if (!response.trigger) {
    throw new ScyllaError('CreateTrigger returned no trigger');
  }
  return {
    trigger: toDomain(response.trigger),
    webhookSecret: response.webhookSecret,
  };
}

function inputToProto(input: TriggerInput): ProtoTriggerInput {
  return {
    key: input.key,
    source:
      input.value.kind === 'literal'
        ? { oneofKind: 'literal', literal: input.value.value }
        : { oneofKind: 'jsonPointer', jsonPointer: input.value.value },
  };
}

function draftSourceToProto(draft: TriggerDraft): CreateTriggerRequest['source'] {
  return draft.source.kind === TriggerKind.Cron
    ? { oneofKind: 'cron', cron: { expression: draft.source.expression } }
    : { oneofKind: 'webhook', webhook: { signatureHeader: draft.source.signatureHeader } };
}

export function draftToCreateRequest(
  pipelineId: string,
  draft: TriggerDraft,
): CreateTriggerRequest {
  return {
    pipelineId: wrapId(pipelineId),
    name: draft.name,
    source: draftSourceToProto(draft),
    inputs: draft.inputs.map(inputToProto),
  };
}

export function draftToUpdateRequest(triggerId: string, draft: TriggerDraft): UpdateTriggerRequest {
  return {
    triggerId: wrapId(triggerId),
    name: draft.name,
    source: draftSourceToProto(draft),
    inputs: draft.inputs.map(inputToProto),
  };
}
