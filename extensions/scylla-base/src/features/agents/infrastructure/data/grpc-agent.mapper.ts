import type {
  AgentStats as ProtoAgentStats,
  Agent as ProtoAgent,
  AgentHost as ProtoAgentHost,
} from '@base/generated/scylla/agent/v1/agent_admin.ts';
import type {
  AgentEntity,
  AgentHost,
} from '@base/features/agents/domain/entities/agent.entity.ts';
import type { AgentStats } from '@base/features/agents/domain/structs/agent.struct.ts';
import type { AgentJob } from '@base/features/agents/domain/structs/agent-job.struct.ts';
import { JobOutcome, type Job as ProtoJob } from '@base/generated/scylla/job/v1/job.ts';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
} from '@shared/infrastructure/grpc/wrappers.ts';

const OUTCOMES: Partial<Record<JobOutcome, string>> = {
  [JobOutcome.COMPLETED]: 'completed',
  [JobOutcome.FAILED]: 'failed',
  [JobOutcome.CANCELLED]: 'cancelled',
  [JobOutcome.ORPHANED]: 'orphaned',
};

/** The status names of `features/jobs`. An arm or an outcome newer than this build is `unknown`. */
const jobStatusOf = (state: ProtoJob['state']): string => {
  switch (state.oneofKind) {
    case 'pending':
      return 'pending';
    case 'running':
      return 'running';
    case 'terminal':
      return OUTCOMES[state.terminal.outcome] ?? 'unknown';
    default:
      return 'unknown';
  }
};

export class GrpcAgentMapper {
  static toDomain(w: ProtoAgent): AgentEntity {
    return {
      id: idValue(w.agentId),
      organizationId: idValue(w.organizationId),
      name: w.name,
      isActive: w.isActive,
      connected: w.connected,
      lastSeen: timestampToIso(w.lastSeen),
      inFlight: w.inFlight,
      host: w.host ? GrpcAgentMapper.hostToDomain(w.host) : null,
      createdAt: timestampToIso(w.createdAt),
      updatedAt: timestampToIso(w.updatedAt),
    };
  }

  private static hostToDomain(h: ProtoAgentHost): AgentHost {
    return {
      version: h.version,
      os: h.os,
      arch: h.arch,
      hostname: h.hostname,
      cpuCount: h.cpuCount > 0 ? h.cpuCount : null,
      totalMemoryMb: h.totalMemoryMb > 0n ? Number(h.totalMemoryMb) : null,
      reportedAt: timestampToIso(h.reportedAt),
    };
  }

  static jobToDomain(job: ProtoJob): AgentJob {
    const { state } = job;
    const startedAt =
      state.oneofKind === 'running'
        ? state.running.startedAt
        : state.oneofKind === 'terminal'
          ? state.terminal.startedAt
          : undefined;

    return {
      id: idValue(job.jobId),
      pipelineId: idValue(job.pipelineId),
      status: jobStatusOf(state),
      createdAt: timestampToIso(job.createdAt),
      startedAt: timestampToIsoOpt(startedAt),
      finishedAt: timestampToIsoOpt(
        state.oneofKind === 'terminal' ? state.terminal.finishedAt : undefined,
      ),
    };
  }

  static statsToDomain(s: ProtoAgentStats): AgentStats {
    return {
      total: Number(s.total),
      pending: Number(s.pending),
      running: Number(s.running),
      completed: Number(s.completed),
      failed: Number(s.failed),
      cancelled: Number(s.cancelled),
      orphaned: Number(s.orphaned),
      lastRunAt: timestampToIso(s.lastRunAt),
      medianDurationMs: optionalCount(s.medianDurationMs),
      p95DurationMs: optionalCount(s.p95DurationMs),
      daily: s.daily.map(d => ({
        day: timestampToIso(d.day),
        completed: Number(d.completed),
        failed: Number(d.failed),
        cancelled: Number(d.cancelled),
        orphaned: Number(d.orphaned),
        medianDurationMs: optionalCount(d.medianDurationMs),
      })),
    };
  }
}

/** Absent on the wire means unknown: `null`, never 0. */
const optionalCount = (v: bigint | undefined): number | null =>
  v === undefined ? null : Number(v);
