import {
  type App,
  type AppKey,
  type CiIdentity,
  CiProvider as GrpcCiProvider,
  type Host,
} from '@base/generated/scylla/apps/v1/app.ts';
import type { AgentStats as GrpcAgentStats, JobOutcomes as GrpcJobOutcomes } from '@base/generated/scylla/agents/v1/agent_stats.ts';
import type { Duration } from '@base/generated/google/protobuf/duration.ts';
import { type Job, JobStatus as GrpcJobStatus } from '@base/generated/scylla/pipelines/v1/job.ts';
import type {
  AppEntity,
  AppHost,
  AppJob,
  AppKeyEntity,
} from '@base/features/apps/domain/entities/app.entity.ts';
import type {
  CiIdentityEntity,
  CiProvider,
} from '@base/features/apps/domain/entities/ci-identity.entity.ts';
import type {
  AgentStats,
  JobOutcomes,
} from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import { limitsToDomain } from '@shared/infrastructure/grpc/api-token.mapper.ts';
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
    runningJobs: app.runningJobs,
    disabledAt: timestampToIso(app.disabledAt),
  };
}

export function keyToDomain(key: AppKey): AppKeyEntity {
  return {
    id: idValue(key.id),
    label: key.label,
    createdAt: timestampToIso(key.createdAt),
    revokedAt: timestampToIso(key.revokedAt),
    lastUsedAt: timestampToIso(key.lastUsedAt),
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

const outcomesToDomain = (outcomes: GrpcJobOutcomes | undefined): JobOutcomes => ({
  completed: outcomes?.completed ?? 0,
  failed: outcomes?.failed ?? 0,
  cancelled: outcomes?.cancelled ?? 0,
  orphaned: outcomes?.orphaned ?? 0,
});

/** `null` for an absent duration: no job started and ended. */
const durationMs = (duration: Duration | undefined): number | null =>
  duration ? Number(duration.seconds) * 1000 + Math.round(duration.nanos / 1e6) : null;

export function statsToDomain(stats: GrpcAgentStats): AgentStats {
  return {
    agentId: idValue(stats.agentId),
    outcomes: outcomesToDomain(stats.outcomes),
    medianMs: durationMs(stats.medianDuration),
    p95Ms: durationMs(stats.p95Duration),
    days: stats.days.map((day) => ({
      day: timestampToIso(day.day),
      outcomes: outcomesToDomain(day.outcomes),
    })),
  };
}

export function ciIdentityToDomain(identity: CiIdentity): CiIdentityEntity {
  return {
    id: idValue(identity.id),
    provider: identity.provider === GrpcCiProvider.GITLAB ? 'gitlab' : 'github',
    issuer: identity.issuer,
    repository: identity.repository,
    gitRef: identity.gitRef,
    environment: identity.environment,
    limits: limitsToDomain(identity.limits),
    createdAt: timestampToIso(identity.createdAt),
    lastUsedAt: timestampToIso(identity.lastUsedAt),
  };
}

export const providerToProto = (provider: CiProvider): GrpcCiProvider =>
  provider === 'gitlab' ? GrpcCiProvider.GITLAB : GrpcCiProvider.GITHUB;
