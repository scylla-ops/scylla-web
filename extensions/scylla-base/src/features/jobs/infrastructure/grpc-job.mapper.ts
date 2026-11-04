import type {
  JobEntity,
  JobNodeExecution,
  JobLog,
  NodeExecutionState,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import {
  type Job,
  JobStatus as GrpcJobStatus,
  type LogLine,
  LogStream,
  NodeStatus,
  type NodeRun,
} from '@base/generated/scylla/pipelines/v1/job.ts';
import type { PaginatedList, PaginationParams } from '@scylla/ui/structs';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
} from '@shared/infrastructure/grpc/wrappers.ts';

/** UNSPECIFIED or a status newer than this build: `unknown`, never a success. */
function jobStatusToDomain(status: GrpcJobStatus): JobStatus {
  switch (status) {
    case GrpcJobStatus.PENDING:
      return 'pending';
    case GrpcJobStatus.RUNNING:
      return 'running';
    case GrpcJobStatus.COMPLETED:
      return 'completed';
    case GrpcJobStatus.FAILED:
      return 'failed';
    case GrpcJobStatus.CANCELLED:
      return 'cancelled';
    case GrpcJobStatus.ORPHANED:
      return 'orphaned';
    default:
      return 'unknown';
  }
}

function nodeStatusToDomain(status: NodeStatus): NodeExecutionState {
  switch (status) {
    case NodeStatus.PENDING:
      return 'pending';
    case NodeStatus.RUNNING:
      return 'running';
    case NodeStatus.COMPLETED:
      return 'completed';
    case NodeStatus.FAILED:
      return 'failed';
    case NodeStatus.SKIPPED:
      return 'skipped';
    case NodeStatus.CANCELLED:
      return 'cancelled';
    default:
      return 'unknown';
  }
}

/** `UNSPECIFIED` or an unknown stream gives `''`. */
function logStreamToString(stream: LogStream): string {
  switch (stream) {
    case LogStream.STDOUT:
      return 'stdout';
    case LogStream.STDERR:
      return 'stderr';
    default:
      return '';
  }
}

/**
 * One execution for each node of the job, from its last attempt. A node with no run yet is
 * pending. The attempts are counted from 1; the maximum is one more than the retries.
 */
function nodeExecutionsOf(job: Job): JobNodeExecution[] {
  const lastRun = new Map<string, NodeRun>();
  for (const run of job.runs) {
    const known = lastRun.get(run.nodeId);
    if (!known || run.attempt >= known.attempt) lastRun.set(run.nodeId, run);
  }
  return job.nodes.map(node => {
    const run = lastRun.get(node.id);
    return {
      id: node.id,
      state: run ? nodeStatusToDomain(run.status) : 'pending',
      startedAt: timestampToIsoOpt(run?.startedAt),
      finishedAt: timestampToIsoOpt(run?.finishedAt),
      attempts: run?.attempt ?? 0,
      maxAttempts: node.retries + 1,
      error: run?.error || undefined,
    };
  });
}

export function toDomain(job: Job): JobEntity {
  const createdAt = timestampToIso(job.createdAt);
  const startedAt = timestampToIsoOpt(job.startedAt);
  const finishedAt = timestampToIsoOpt(job.finishedAt);
  return {
    id: idValue(job.id),
    pipelineId: idValue(job.pipelineId),
    status: jobStatusToDomain(job.status),
    nodeExecutions: nodeExecutionsOf(job),
    createdAt,
    // The server has no time of the last change: the last time it knows.
    updatedAt: finishedAt ?? startedAt ?? createdAt,
    startedAt,
    finishedAt,
    error: job.error || undefined,
  };
}

/**
 * One page of the whole list, most recent first. The server pages with tokens and has no
 * count: the list is read whole, then cut here, so that the page numbers of the UI stay.
 */
export function toDomainPage(
  jobs: Job[],
  { page, pageSize }: PaginationParams,
): PaginatedList<JobEntity> {
  const sorted = jobs.map(toDomain).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    pagination: {
      totalCount: sorted.length,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/** The lines of one answer of the stream. A line has no id: its cursor and its place give one. */
export function logLinesToDomain(
  jobId: string,
  nodeId: string,
  cursor: string,
  lines: LogLine[],
): JobLog[] {
  return lines.map((line, index) => ({
    id: `${cursor}:${index}`,
    jobId,
    nodeId,
    stream: logStreamToString(line.stream),
    line: line.text,
    timestamp: timestampToIso(line.at),
  }));
}
