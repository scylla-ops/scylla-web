import type {
  CreateTriggerRequest,
  CreateTriggerResponse,
  UpdateTriggerRequest,
} from '@base/generated/scylla/pipelines/v1/trigger_service.ts';
import {
  FireStatus,
  PullRequestEvent as ProtoPullRequestEvent,
  type Trigger as ProtoTrigger,
  type TriggerInput as ProtoTriggerInput,
} from '@base/generated/scylla/pipelines/v1/trigger.ts';
import type {
  CreatedTrigger,
  GitSource,
  PullRequestEvent,
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

const EVENTS: ReadonlyArray<[ProtoPullRequestEvent, PullRequestEvent]> = [
  [ProtoPullRequestEvent.OPENED, 'opened'],
  [ProtoPullRequestEvent.SYNCHRONIZED, 'newCommits'],
  [ProtoPullRequestEvent.REOPENED, 'reopened'],
  [ProtoPullRequestEvent.READY_FOR_REVIEW, 'readyForReview'],
];

/** An event newer than this build is dropped: the rule still shows, with the known events. */
const eventsToDomain = (events: ProtoPullRequestEvent[]): PullRequestEvent[] =>
  events.flatMap(event => EVENTS.filter(([proto]) => proto === event).map(([, domain]) => domain));

const eventToProto = (event: PullRequestEvent): ProtoPullRequestEvent =>
  EVENTS.find(([, domain]) => domain === event)?.[0] ?? ProtoPullRequestEvent.UNSPECIFIED;

function sourceToDomain(kind: ProtoTrigger['kind'], apiUrl: string): TriggerSource {
  switch (kind.oneofKind) {
    case 'cron':
      return { kind: 'cron', expression: kind.cron.schedule };
    case 'webhook':
      return { kind: 'webhook', webhookUrl: `${apiUrl}${kind.webhook.path}` };
    case 'push':
      return {
        kind: 'push',
        branches: kind.push.branches,
        excludeBranches: kind.push.excludeBranches,
        skipCi: kind.push.skipCi,
      };
    case 'pullRequest':
      return {
        kind: 'pullRequest',
        branches: kind.pullRequest.branches,
        events: eventsToDomain(kind.pullRequest.events),
        drafts: kind.pullRequest.drafts,
      };
    case 'tag':
      return { kind: 'tag', patterns: kind.tag.patterns };
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
    fromFile: trigger.fromFile,
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

/** The rules of a Git source, as the `rules` of an update; the `kind` of a create has the same arms. */
function rulesToProto(source: GitSource): Exclude<UpdateTriggerRequest['rules'], { oneofKind: undefined }> {
  switch (source.kind) {
    case 'push':
      return {
        oneofKind: 'push',
        push: {
          branches: source.branches,
          excludeBranches: source.excludeBranches,
          skipCi: source.skipCi,
        },
      };
    case 'pullRequest':
      return {
        oneofKind: 'pullRequest',
        pullRequest: {
          branches: source.branches,
          events: source.events.map(eventToProto),
          drafts: source.drafts,
        },
      };
    case 'tag':
      return { oneofKind: 'tag', tag: { patterns: source.patterns } };
  }
}

function kindToProto(source: TriggerDraft['source']): CreateTriggerRequest['kind'] {
  switch (source.kind) {
    case 'cron':
      return { oneofKind: 'cron', cron: { schedule: source.expression } };
    case 'webhook':
      return { oneofKind: 'webhook', webhook: { path: '' } };
    default:
      return rulesToProto(source);
  }
}

export function draftToCreateRequest(
  pipelineId: string,
  draft: TriggerDraft,
): CreateTriggerRequest {
  return {
    pipelineId: wrapId(pipelineId),
    name: draft.name,
    kind: kindToProto(draft.source),
    inputs: draft.inputs.map(inputToProto),
  };
}

/**
 * The kind of a trigger does not change: a cron gets its new schedule, a Git trigger its new
 * rules, a webhook keeps its path.
 */
export function draftToUpdateRequest(triggerId: string, draft: TriggerDraft): UpdateTriggerRequest {
  const { source } = draft;
  return {
    triggerId: wrapId(triggerId),
    name: draft.name,
    ...(source.kind === 'cron' && { schedule: source.expression }),
    inputs: { inputs: draft.inputs.map(inputToProto) },
    rules:
      source.kind === 'cron' || source.kind === 'webhook'
        ? { oneofKind: undefined }
        : rulesToProto(source),
  };
}
