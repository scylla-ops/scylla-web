import type {
  JobBucket,
  JobFigures,
  JobGroup,
  JobStats,
  JobStatsBucketSize,
  JobStatsGroupBy,
  JobStatsOrder,
  JobStatsQuery,
} from '@base/features/jobs/domain/structs/job-stats.struct.ts';
import type { GetJobStatsRequest, GetJobStatsResponse } from '@base/generated/scylla/pipelines/v1/job_service.ts';
import {
  JobStatsBucket,
  JobStatsGroup,
  JobStatsOrder as GrpcJobStatsOrder,
  type JobBucket as GrpcJobBucket,
  type JobFigures as GrpcJobFigures,
  type JobGroup as GrpcJobGroup,
} from '@base/generated/scylla/pipelines/v1/job_stats.ts';
import type { Duration } from '@base/generated/google/protobuf/duration.ts';
import { Timestamp } from '@base/generated/google/protobuf/timestamp.ts';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

const BUCKETS: Record<JobStatsBucketSize, JobStatsBucket> = {
  hour: JobStatsBucket.HOUR,
  day: JobStatsBucket.DAY,
  week: JobStatsBucket.WEEK,
};

const GROUPS: Record<JobStatsGroupBy, JobStatsGroup> = {
  project: JobStatsGroup.PROJECT,
  pipeline: JobStatsGroup.PIPELINE,
  agent: JobStatsGroup.AGENT,
};

const ORDERS: Record<JobStatsOrder, GrpcJobStatsOrder> = {
  count: GrpcJobStatsOrder.COUNT,
  failed: GrpcJobStatsOrder.FAILED,
  'p50-duration': GrpcJobStatsOrder.P50_DURATION,
  'run-time': GrpcJobStatsOrder.RUN_TIME,
};

/** An absent duration gives `null`, in seconds. */
export const durationToSeconds = (duration?: Duration): number | null =>
  duration ? Number(duration.seconds) + duration.nanos / 1e9 : null;

/** A field that the query does not set gives the default of the server. */
export const queryToProto = (query: JobStatsQuery): GetJobStatsRequest => ({
  workspaceId: wrapId(query.workspaceId),
  projectIds: (query.projectIds ?? []).map(wrapId),
  pipelineIds: (query.pipelineIds ?? []).map(wrapId),
  origins: [],
  from: Timestamp.fromDate(query.from),
  ...(query.to && { to: Timestamp.fromDate(query.to) }),
  bucket: query.bucket ? BUCKETS[query.bucket] : JobStatsBucket.UNSPECIFIED,
  groupBy: query.groupBy ? GROUPS[query.groupBy] : JobStatsGroup.UNSPECIFIED,
  groupOrder: query.groupOrder ? ORDERS[query.groupOrder] : GrpcJobStatsOrder.UNSPECIFIED,
  groupLimit: query.groupLimit ?? 0,
  compare: query.compare ?? false,
});

export const figuresToDomain = (figures?: GrpcJobFigures): JobFigures => ({
  created: figures?.created ?? 0,
  outcomes: {
    completed: figures?.outcomes?.completed ?? 0,
    failed: figures?.outcomes?.failed ?? 0,
    cancelled: figures?.outcomes?.cancelled ?? 0,
    orphaned: figures?.outcomes?.orphaned ?? 0,
  },
  p50Duration: durationToSeconds(figures?.p50Duration),
  p95Duration: durationToSeconds(figures?.p95Duration),
  p50Queue: durationToSeconds(figures?.p50Queue),
  p95Queue: durationToSeconds(figures?.p95Queue),
  runTime: durationToSeconds(figures?.runTime) ?? 0,
});

const bucketToDomain = (bucket: GrpcJobBucket): JobBucket => ({
  start: timestampToIso(bucket.start),
  figures: figuresToDomain(bucket.figures),
});

/** A group of an origin has no id: the domain does not ask for it, and it is dropped. */
const groupToDomain = (group: GrpcJobGroup): JobGroup | null =>
  group.key.oneofKind === 'id'
    ? {
        id: idValue(group.key.id),
        figures: figuresToDomain(group.figures),
        previous: group.previous ? figuresToDomain(group.previous) : null,
      }
    : null;

export const toDomain = (response: GetJobStatsResponse): JobStats => ({
  totals: figuresToDomain(response.totals),
  buckets: response.buckets.map(bucketToDomain),
  groups: response.groups.map(groupToDomain).filter(group => group !== null),
  previous: response.previous ? figuresToDomain(response.previous) : null,
  timeZone: response.timeZone,
});
