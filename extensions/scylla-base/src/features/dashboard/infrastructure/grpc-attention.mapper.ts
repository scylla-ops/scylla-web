import {
  AttentionKind as GrpcKind,
  type AttentionItem as GrpcItem,
} from '@base/generated/scylla/dashboards/v1/attention.ts';
import type { ListAttentionItemsResponse } from '@base/generated/scylla/dashboards/v1/dashboard_service.ts';
import { idValue, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  AttentionItem,
  AttentionKind,
  AttentionList,
} from '@base/features/dashboard/domain/structs/attention.struct.ts';

const KINDS: Readonly<Partial<Record<GrpcKind, AttentionKind>>> = {
  [GrpcKind.JOB_FAILED]: 'job-failed',
  [GrpcKind.JOB_ORPHANED]: 'job-orphaned',
  [GrpcKind.FIRE_FAILED]: 'fire-failed',
  [GrpcKind.FIRE_MISSED]: 'fire-missed',
  [GrpcKind.AGENT_OFFLINE]: 'agent-offline',
  [GrpcKind.APPROVAL_WAITING]: 'approval-waiting',
};

/** An item of a kind that this build does not know gives nothing. */
export const toItem = (item: GrpcItem): AttentionItem | null => {
  const kind = KINDS[item.kind];
  if (!kind) return null;
  const subject = item.subject;
  return {
    kind,
    at: timestampToIso(item.at),
    isNew: item.isNew,
    count: Math.max(1, item.count),
    projectId: idValue(item.projectId),
    projectName: item.projectName,
    pipelineId: idValue(item.pipelineId),
    pipelineName: item.pipelineName,
    ...(subject.oneofKind === 'job' && {
      job: {
        id: idValue(subject.job.id),
        error: subject.job.error,
        branch: subject.job.branch,
        agentName: subject.job.agentName,
        nodeId: subject.job.node?.nodeId ?? '',
        nodeError: subject.job.node?.error ?? '',
      },
    }),
    ...(subject.oneofKind === 'fire' && {
      fire: {
        id: idValue(subject.fire.id),
        triggerId: idValue(subject.fire.triggerId),
        triggerName: subject.fire.triggerName,
        schedule: subject.fire.schedule,
        error: subject.fire.error,
      },
    }),
    ...(subject.oneofKind === 'agent' && {
      agent: {
        id: idValue(subject.agent.id),
        name: subject.agent.name,
        lastSeenAt: timestampToIso(subject.agent.lastSeenAt),
      },
    }),
  };
};

export const toList = (response: ListAttentionItemsResponse): AttentionList => ({
  items: response.items.flatMap(item => toItem(item) ?? []),
  openCount: response.openCount,
  newCount: response.newCount,
  counts: response.counts.flatMap(count => {
    const kind = KINDS[count.kind];
    return kind ? [{ kind, open: count.openCount }] : [];
  }),
});
