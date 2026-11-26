import type { ITriggerServiceClient } from '@base/generated/scylla/pipelines/v1/trigger_service.client.ts';
import { FireStatus, TriggerKind } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import type { TriggerFire } from '@base/generated/scylla/pipelines/v1/trigger_fire.ts';
import { TriggerOrder } from '@base/generated/scylla/pipelines/v1/trigger_summary.ts';
import { JobStatus as GrpcJobStatus } from '@base/generated/scylla/pipelines/v1/job.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type { SchedulesRepository } from '@base/features/dashboard/domain/repository/schedules.repository.ts';
import type {
  FireState,
  ScheduleFire,
  Schedules,
} from '@base/features/dashboard/domain/structs/schedule.struct.ts';

const DAY_SECONDS = 24 * 60 * 60;
const TRIGGER_LIMIT = 50;
const FIRE_LIMIT = 20;

const STATES: Readonly<Record<FireStatus, FireState>> = {
  [FireStatus.UNSPECIFIED]: 'none',
  [FireStatus.OK]: 'ok',
  [FireStatus.ERROR]: 'error',
  [FireStatus.MISSED]: 'missed',
  // Only a webhook skips a delivery, and this widget reads the cron triggers.
  [FireStatus.SKIPPED]: 'none',
};

const JOB_STATUSES: Readonly<Partial<Record<GrpcJobStatus, JobStatus>>> = {
  [GrpcJobStatus.PENDING]: 'pending',
  [GrpcJobStatus.RUNNING]: 'running',
  [GrpcJobStatus.COMPLETED]: 'completed',
  [GrpcJobStatus.FAILED]: 'failed',
  [GrpcJobStatus.CANCELLED]: 'cancelled',
  [GrpcJobStatus.ORPHANED]: 'orphaned',
  [GrpcJobStatus.AWAITING_APPROVAL]: 'awaiting_approval',
};

const timestamp = (date: Date) => ({
  seconds: BigInt(Math.floor(date.getTime() / 1000)),
  nanos: 0,
});

const toFire = (fire: TriggerFire): ScheduleFire => ({
  id: idValue(fire.id),
  triggerId: idValue(fire.triggerId),
  triggerName: fire.triggerName,
  pipelineId: idValue(fire.pipelineId),
  projectId: idValue(fire.projectId),
  at: timestampToIso(fire.firedAt) || timestampToIso(fire.dueAt),
  state: STATES[fire.status] ?? 'none',
  error: fire.error,
  jobId: idValue(fire.jobId),
  jobStatus: JOB_STATUSES[fire.jobStatus] ?? 'unknown',
});

export class GrpcSchedulesRepository implements SchedulesRepository {
  constructor(private readonly client: ITriggerServiceClient) {}

  public async list(query: {
    workspaceId: string;
    projectIds: string[];
    from: Date;
  }): Promise<Schedules> {
    const projectIds = query.projectIds.map(wrapId);
    const [triggers, fires] = await Promise.all([
      this.client.listWorkspaceTriggers({
        workspaceId: wrapId(query.workspaceId),
        projectIds,
        pipelineIds: [],
        kinds: [TriggerKind.CRON],
        enabledOnly: true,
        order: TriggerOrder.NEXT_FIRE,
        upcoming: { seconds: BigInt(DAY_SECONDS), nanos: 0 },
        page: { size: TRIGGER_LIMIT, token: '' },
        query: '',
      }).response,
      this.client.listTriggerFires({
        workspaceId: wrapId(query.workspaceId),
        projectIds,
        pipelineIds: [],
        triggerIds: [],
        kinds: [TriggerKind.CRON],
        statuses: [],
        sources: [],
        from: timestamp(query.from),
        page: { size: FIRE_LIMIT, token: '' },
      }).response,
    ]);
    return {
      triggers: triggers.triggers.map(summary => ({
        id: idValue(summary.trigger?.id),
        name: summary.trigger?.name ?? '',
        pipelineId: idValue(summary.trigger?.pipelineId),
        pipelineName: summary.pipelineName,
        projectId: idValue(summary.trigger?.projectId),
        projectName: summary.projectName,
        upcoming: summary.upcomingFires.map(timestampToIso),
        lastState: summary.lastFire ? (STATES[summary.lastFire.status] ?? 'none') : 'none',
        failedFires: summary.failedFires,
        missedTimes: summary.missedTimes,
      })),
      fires: fires.fires.map(toFire),
    };
  }
}
