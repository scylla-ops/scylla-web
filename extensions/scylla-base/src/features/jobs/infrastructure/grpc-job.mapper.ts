import type {
  ApprovalState,
  JobApproval,
  JobCheckout,
  JobEntity,
  JobEvent,
  JobFilter,
  JobNodeExecution,
  JobLog,
  JobSource,
  NodeExecutionState,
  PipelineFileError,
  PipelineFileRef,
} from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobFilter as GrpcJobFilter } from '@base/generated/scylla/pipelines/v1/job_service.ts';
import {
  ApprovalState as GrpcApprovalState,
  type FileError as GrpcFileError,
  type JobApproval as GrpcJobApproval,
  type JobSource as GrpcJobSource,
  type PipelineFileRef as GrpcPipelineFileRef,
  SourceEvent,
} from '@base/generated/scylla/pipelines/v1/source.ts';
import { VcsProvider } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import {
  type CheckoutRun,
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

const SOURCE_EVENTS: Record<JobEvent, SourceEvent> = {
  push: SourceEvent.PUSH,
  pull_request: SourceEvent.PULL_REQUEST,
  tag: SourceEvent.TAG,
  manual: SourceEvent.MANUAL,
  provider_rerun: SourceEvent.PROVIDER_RERUN,
  trigger: SourceEvent.TRIGGER,
};

const EVENTS: Partial<Record<SourceEvent, JobEvent>> = Object.fromEntries(
  Object.entries(SOURCE_EVENTS).map(([event, value]) => [value, event as JobEvent]),
);

const APPROVAL_STATES: Partial<Record<GrpcApprovalState, ApprovalState>> = {
  [GrpcApprovalState.WAITING]: 'waiting',
  [GrpcApprovalState.APPROVED]: 'approved',
  [GrpcApprovalState.REJECTED]: 'rejected',
};

/** A field that is not set gives each job: an empty text, no event, 0. */
export const filterToProto = (filter: JobFilter): GrpcJobFilter => ({
  branch: filter.branch?.trim() ?? '',
  event: filter.event ? SOURCE_EVENTS[filter.event] : SourceEvent.UNSPECIFIED,
  authorLogin: filter.authorLogin?.trim() ?? '',
  pullRequest: filter.pullRequest ?? 0,
});

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
    case GrpcJobStatus.AWAITING_APPROVAL:
      return 'awaiting_approval';
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
    };
  });
}

/** A provider that this build does not know: the job shows no source. */
function sourceToDomain(source: GrpcJobSource | undefined): JobSource | undefined {
  if (!source) return undefined;
  const provider =
    source.provider === VcsProvider.GITHUB
      ? 'github'
      : source.provider === VcsProvider.GITLAB
        ? 'gitlab'
        : undefined;
  if (!provider) return undefined;
  const event = EVENTS[source.event];
  return {
    provider,
    repository: source.repository,
    repositoryUrl: source.repositoryUrl,
    sha: source.sha,
    commitUrl: source.commitUrl,
    branch: source.branch,
    tag: source.tag,
    pullRequests: source.pullRequests.map(({ number, title, url }) => ({ number, title, url })),
    fromFork: source.fromFork,
    forkRepository: source.forkRepository,
    authorLogin: source.authorLogin,
    authorAvatarUrl: source.authorAvatarUrl,
    title: source.messageTitle,
    ...(event && { event }),
  };
}

/** A state newer than this build: the job is not known to be decided, so it waits. */
function approvalToDomain(approval: GrpcJobApproval | undefined): JobApproval | undefined {
  if (!approval) return undefined;
  const decidedAt = timestampToIsoOpt(approval.decidedAt);
  return {
    state: APPROVAL_STATES[approval.state] ?? 'waiting',
    ...(approval.decidedBy?.value && { decidedBy: approval.decidedBy.value }),
    ...(decidedAt && { decidedAt }),
    changesPipelineFiles: approval.changesPipelineFiles,
    changesUrl: approval.changesUrl,
  };
}

const pipelineFileToDomain = (file?: GrpcPipelineFileRef): PipelineFileRef | undefined =>
  file ? { path: file.path, commitSha: file.commitSha, url: file.url } : undefined;

const fileErrorToDomain = (error: GrpcFileError): PipelineFileError => ({
  path: error.path,
  line: error.line,
  column: error.column,
  field: error.field,
  message: error.message,
  warning: error.warning,
});

function checkoutToDomain(checkout: CheckoutRun | undefined): JobCheckout | undefined {
  if (!checkout) return undefined;
  return {
    state: nodeStatusToDomain(checkout.status),
    startedAt: timestampToIsoOpt(checkout.startedAt),
    finishedAt: timestampToIsoOpt(checkout.finishedAt),
    error: checkout.error || undefined,
  };
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
    agentId: job.agentId ? idValue(job.agentId) : undefined,
    source: sourceToDomain(job.source),
    approval: approvalToDomain(job.approval),
    pipelineFile: pipelineFileToDomain(job.pipelineFile),
    fileErrors: job.fileErrors.length > 0 ? job.fileErrors.map(fileErrorToDomain) : undefined,
    checkout: checkoutToDomain(job.checkout),
    waitingReason: job.waitingReason || undefined,
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
