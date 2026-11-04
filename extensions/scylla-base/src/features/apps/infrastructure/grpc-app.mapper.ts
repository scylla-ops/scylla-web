import type { App, AppKey, Host } from '@base/generated/scylla/apps/v1/app.ts';
import { type Job, JobStatus as GrpcJobStatus } from '@base/generated/scylla/pipelines/v1/job.ts';
import type {
  AppEntity,
  AppHost,
  AppJob,
  AppKeyEntity,
} from '@base/features/apps/domain/entities/app.entity.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
} from '@shared/infrastructure/grpc/wrappers.ts';

const MB = 1024 * 1024;

/** `null` before the hello of an agent: the server sends an empty host then. */
function hostToDomain(host: Host | undefined): AppHost | null {
  if (!host || (!host.version && !host.hostname)) return null;
  return {
    version: host.version,
    os: host.os,
    arch: host.arch,
    hostname: host.hostname,
    cpuCount: host.cpuCount || null,
    totalMemoryMb: host.memoryBytes ? Math.round(Number(host.memoryBytes) / MB) : null,
    capacity: host.capacity,
    containerRuntime: host.containerRuntime,
  };
}

export function toDomain(app: App): AppEntity {
  return {
    id: idValue(app.id),
    workspaceId: idValue(app.workspaceId),
    name: app.name,
    runner: app.runner,
    connected: app.connected,
    lastSeenAt: timestampToIso(app.lastSeenAt),
    host: hostToDomain(app.host),
    createdAt: timestampToIso(app.createdAt),
  };
}

export function keyToDomain(key: AppKey): AppKeyEntity {
  return {
    id: idValue(key.id),
    createdAt: timestampToIso(key.createdAt),
    revokedAt: timestampToIso(key.revokedAt),
  };
}

/** UNSPECIFIED or a status newer than this build: `unknown`, never a success. */
const STATUS: Partial<Record<GrpcJobStatus, JobStatus>> = {
  [GrpcJobStatus.PENDING]: 'pending',
  [GrpcJobStatus.RUNNING]: 'running',
  [GrpcJobStatus.COMPLETED]: 'completed',
  [GrpcJobStatus.FAILED]: 'failed',
  [GrpcJobStatus.CANCELLED]: 'cancelled',
  [GrpcJobStatus.ORPHANED]: 'orphaned',
};

export function jobToDomain(job: Job): AppJob {
  return {
    id: idValue(job.id),
    pipelineId: idValue(job.pipelineId),
    projectId: idValue(job.projectId),
    status: STATUS[job.status] ?? 'unknown',
    createdAt: timestampToIso(job.createdAt),
    startedAt: timestampToIsoOpt(job.startedAt),
    finishedAt: timestampToIsoOpt(job.finishedAt),
  };
}
