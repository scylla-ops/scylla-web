// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  JobStatsBucket,
  JobStatsGroup,
  JobStatsOrder,
} from '@base/generated/scylla/pipelines/v1/job_stats.ts';
import { JobOrigin } from '@base/generated/scylla/pipelines/v1/job.ts';
import {
  durationToSeconds,
  figuresToDomain,
  queryToProto,
  toDomain,
} from '../grpc-job-stats.mapper.ts';

const FROM = new Date('2026-11-03T23:00:00Z');

describe('queryToProto', () => {
  it('sends the period, the bucket, the groups and the comparison', () => {
    const request = queryToProto({
      workspaceId: 'org-1',
      from: FROM,
      to: new Date('2026-11-17T23:00:00Z'),
      bucket: 'day',
      groupBy: 'pipeline',
      groupOrder: 'failed',
      groupLimit: 5,
      compare: true,
    });

    expect(request).toMatchObject({
      workspaceId: { value: 'org-1' },
      from: { seconds: BigInt(FROM.getTime() / 1000), nanos: 0 },
      to: { seconds: BigInt(Date.parse('2026-11-17T23:00:00Z') / 1000), nanos: 0 },
      bucket: JobStatsBucket.DAY,
      groupBy: JobStatsGroup.PIPELINE,
      groupOrder: JobStatsOrder.FAILED,
      groupLimit: 5,
      compare: true,
    });
  });

  it('leaves the end unset for a period that ends now, and the rest to the server', () => {
    const request = queryToProto({ workspaceId: 'org-1', from: FROM, to: null });

    expect(request.to).toBeUndefined();
    expect(request).toMatchObject({
      projectIds: [],
      pipelineIds: [],
      bucket: JobStatsBucket.UNSPECIFIED,
      groupBy: JobStatsGroup.UNSPECIFIED,
      groupOrder: JobStatsOrder.UNSPECIFIED,
      groupLimit: 0,
      compare: false,
    });
  });
});

describe('durationToSeconds', () => {
  it('reads the seconds and the nanoseconds', () => {
    expect(durationToSeconds({ seconds: 190n, nanos: 500_000_000 })).toBe(190.5);
  });

  it('gives null for a duration that is not set', () => {
    expect(durationToSeconds(undefined)).toBeNull();
  });
});

describe('toDomain', () => {
  it('maps the totals, the previous period, the buckets and the groups', () => {
    const stats = toDomain({
      totals: {
        created: 170,
        outcomes: { completed: 146, failed: 15, cancelled: 5, orphaned: 3 },
        p50Duration: { seconds: 190n, nanos: 0 },
        p95Duration: { seconds: 525n, nanos: 0 },
        runTime: { seconds: 3600n, nanos: 0 },
      },
      previous: { created: 10, outcomes: { completed: 8, failed: 2, cancelled: 0, orphaned: 0 } },
      buckets: [
        {
          start: { seconds: BigInt(FROM.getTime() / 1000), nanos: 0 },
          figures: { created: 0 },
        },
      ],
      groups: [
        {
          key: { oneofKind: 'id', id: { value: 'pipeline-1' } },
          figures: { created: 3, outcomes: { completed: 1, failed: 2, cancelled: 0, orphaned: 0 } },
        },
        { key: { oneofKind: 'origin', origin: JobOrigin.UNSPECIFIED } },
      ],
      timeZone: 'Europe/Paris',
    });

    expect(stats.totals).toEqual({
      created: 170,
      outcomes: { completed: 146, failed: 15, cancelled: 5, orphaned: 3 },
      p50Duration: 190,
      p95Duration: 525,
      p50Queue: null,
      p95Queue: null,
      runTime: 3600,
    });
    expect(stats.previous?.outcomes.failed).toBe(2);
    expect(stats.buckets).toEqual([
      { start: FROM.toISOString(), figures: figuresToDomain({ created: 0 }) },
    ]);
    expect(stats.groups).toHaveLength(1);
    expect(stats.groups[0]).toMatchObject({ id: 'pipeline-1', previous: null });
    expect(stats.timeZone).toBe('Europe/Paris');
  });

  it('gives no previous period when the request did not compare', () => {
    expect(toDomain({ buckets: [], groups: [], timeZone: '' }).previous).toBeNull();
  });
});
