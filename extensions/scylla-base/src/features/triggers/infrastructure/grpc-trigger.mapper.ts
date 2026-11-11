import type {
  CreateTriggerRequest,
  CreateTriggerResponse,
  UpdateTriggerRequest,
} from '@base/generated/scylla/pipelines/v1/trigger_service.ts';
import {
  FireStatus,
  type Trigger as ProtoTrigger,
  type TriggerInput as ProtoTriggerInput,
} from '@base/generated/scylla/pipelines/v1/trigger.ts';
import type {
  CreatedTrigger,
  TriggerDraft,
  TriggerEntity,
  TriggerFireResult,
  TriggerInput,
  TriggerSource,
} from '@base/features/triggers/domain/entities/trigger.entity.ts';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
  wrapId,
  required,
} from '@shared/infrastructure/grpc/wrappers.ts';

function sourceToDomain(kind: ProtoTrigger['kind'], apiUrl: string): TriggerSource {
  switch (kind.oneofKind) {
    case 'cron':
      return { kind: 'cron', expression: kind.cron.schedule };
    case 'webhook':
      return { kind: 'webhook', webhookUrl: `${apiUrl}${kind.webhook.path}` };
    default:
      // A kind arm newer than this build: unknown.
      return { kind: 'unknown' };
  }
}

function lastResultOf(trigger: ProtoTrigger): TriggerFireResult | undefined {
  if (!trigger.lastFiredAt) return undefined;
  switch (trigger.lastStatus) {
    case FireStatus.OK:
      return { kind: 'succeeded' };
    case FireStatus.ERROR:
      return { kind: 'failed', error: trigger.lastError };
    default:
      // An outcome newer than this build: neither success nor failure.
      return { kind: 'unknown' };
  }
}

function inputToDomain(input: ProtoTriggerInput): TriggerInput {
  switch (input.value.oneofKind) {
    case 'literal':
      return { key: input.name, value: { kind: 'literal', value: input.value.literal } };
    case 'jsonPointer':
      return { key: input.name, value: { kind: 'jsonPointer', value: input.value.jsonPointer } };
    default:
      return { key: input.name, value: { kind: 'literal', value: '' } };
  }
}

/** `apiUrl` makes the address of a webhook: the server gives its path only. */
export function toDomain(trigger: ProtoTrigger, apiUrl = ''): TriggerEntity {
  return {
    id: idValue(trigger.id),
    pipelineId: idValue(trigger.pipelineId),
    name: trigger.name,
    source: sourceToDomain(trigger.kind, apiUrl),
    inputs: trigger.inputs.map(inputToDomain),
    enabled: trigger.enabled,
    // A disabled trigger has no due time.
    nextFireAt: trigger.enabled ? timestampToIsoOpt(trigger.nextFireAt) : undefined,
    lastFiredAt: timestampToIsoOpt(trigger.lastFiredAt),
    lastResult: lastResultOf(trigger),
    createdAt: timestampToIso(trigger.createdAt),
    updatedAt: timestampToIso(trigger.updatedAt),
  };
}

export function createdToDomain(response: CreateTriggerResponse, apiUrl = ''): CreatedTrigger {
  return {
    trigger: toDomain(required(response.trigger, 'trigger'), apiUrl),
    ...(response.webhookSecret ? { webhookSecret: response.webhookSecret } : {}),
  };
}

function inputToProto(input: TriggerInput): ProtoTriggerInput {
  return {
    name: input.key,
    value:
      input.value.kind === 'literal'
        ? { oneofKind: 'literal', literal: input.value.value }
        : { oneofKind: 'jsonPointer', jsonPointer: input.value.value },
  };
}

export function draftToCreateRequest(
  pipelineId: string,
  draft: TriggerDraft,
): CreateTriggerRequest {
  return {
    pipelineId: wrapId(pipelineId),
    name: draft.name,
    kind:
      draft.source.kind === 'cron'
        ? { oneofKind: 'cron', cron: { schedule: draft.source.expression } }
        : { oneofKind: 'webhook', webhook: { path: '' } },
    inputs: draft.inputs.map(inputToProto),
  };
}

/** The kind of a trigger does not change: a cron gets its new schedule, a webhook keeps its path. */
export function draftToUpdateRequest(triggerId: string, draft: TriggerDraft): UpdateTriggerRequest {
  return {
    triggerId: wrapId(triggerId),
    name: draft.name,
    ...(draft.source.kind === 'cron' && { schedule: draft.source.expression }),
    inputs: { inputs: draft.inputs.map(inputToProto) },
    rules: { oneofKind: undefined },
  };
}
