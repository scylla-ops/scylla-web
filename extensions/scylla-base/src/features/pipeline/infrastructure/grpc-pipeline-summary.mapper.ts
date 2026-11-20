import type {
  PipelineHealth,
  PipelineSummary,
  PipelineSummaryList,
  PipelineSummaryOrder,
  PipelineTriggerKind,
  RecentRun,
} from '@base/features/pipeline/domain/structs/pipeline-summary.struct.ts';
import type { ListPipelineSummariesResponse } from '@base/generated/scylla/pipelines/v1/pipeline_service.ts';
import {
  PipelineSummaryOrder as GrpcPipelineSummaryOrder,
  type PipelineSummary as GrpcPipelineSummary,
  type RecentJob,
} from '@base/generated/scylla/pipelines/v1/pipeline_summary.ts';
import { JobStatus as GrpcJobStatus } from '@base/generated/scylla/pipelines/v1/job.ts';
import { TriggerKind } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import { idValue, timestampToIso, timestampToIsoOpt } from '@shared/infrastructure/grpc/wrappers.ts';

const STATUSES: Partial<Record<GrpcJobStatus, JobStatus>> = {
  [GrpcJobStatus.PENDING]: 'pending',
  [GrpcJobStatus.RUNNING]: 'running',
  [GrpcJobStatus.COMPLETED]: 'completed',
  [GrpcJobStatus.FAILED]: 'failed',
  [GrpcJobStatus.CANCELLED]: 'cancelled',
  [GrpcJobStatus.ORPHANED]: 'orphaned',
  [GrpcJobStatus.AWAITING_APPROVAL]: 'awaiting_approval',
};

const TRIGGER_KINDS: Partial<Record<TriggerKind, PipelineTriggerKind>> = {
  [TriggerKind.CRON]: 'cron',
  [TriggerKind.WEBHOOK]: 'webhook',
  [TriggerKind.PUSH]: 'push',
  [TriggerKind.PULL_REQUEST]: 'pull_request',
};

const ORDERS: Record<PipelineSummaryOrder, GrpcPipelineSummaryOrder> = {
  'failing-first': GrpcPipelineSummaryOrder.FAILING_FIRST,
  slowest: GrpcPipelineSummaryOrder.SLOWEST,
  name: GrpcPipelineSummaryOrder.NAME,
};

export const orderToProto = (order: PipelineSummaryOrder): GrpcPipelineSummaryOrder =>
  ORDERS[order];

/** A status newer than this build: `unknown`. */
const statusToDomain = (status: GrpcJobStatus): JobStatus => STATUSES[status] ?? 'unknown';

/** Unspecified: no ended job. A status that is not COMPLETED: red. */
export const healthOf = (lastEndedStatus: GrpcJobStatus): PipelineHealth =>
  lastEndedStatus === GrpcJobStatus.UNSPECIFIED
    ? 'none'
    : lastEndedStatus === GrpcJobStatus.COMPLETED
      ? 'green'
      : 'red';

const recentToDomain = (job: RecentJob): RecentRun => ({
  id: idValue(job.id),
  status: statusToDomain(job.status),
  branch: job.branch,
  createdAt: timestampToIso(job.createdAt),
  startedAt: timestampToIsoOpt(job.startedAt),
  finishedAt: timestampToIsoOpt(job.finishedAt),
});

export const toDomain = (summary: GrpcPipelineSummary): PipelineSummary => ({
  id: idValue(summary.pipelineId),
  name: summary.name,
  projectId: idValue(summary.projectId),
  projectName: summary.projectName,
  recent: summary.recent.map(recentToDomain),
  completed: summary.completed,
  failed: summary.failed,
  medianDuration: summary.medianDuration
    ? Number(summary.medianDuration.seconds) + summary.medianDuration.nanos / 1e9
    : null,
  health: healthOf(summary.lastEndedStatus),
  active: summary.active,
  triggerKinds: summary.triggerKinds.flatMap(kind => TRIGGER_KINDS[kind] ?? []),
  nextFire: summary.nextFire?.at
    ? { at: timestampToIso(summary.nextFire.at), schedule: summary.nextFire.schedule }
    : null,
});

export const listToDomain = (response: ListPipelineSummariesResponse): PipelineSummaryList => ({
  items: response.pipelines.map(toDomain),
  total: response.total,
  green: response.green,
});
