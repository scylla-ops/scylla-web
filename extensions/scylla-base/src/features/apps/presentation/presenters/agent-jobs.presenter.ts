import { t } from '@scylla/ui/i18n';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import { formatDuration } from '@shared/utils/date-utils.ts';
import { getStatusConfig } from '@shared/utils/status-config.ts';
import type { AppJob } from '@base/features/apps/domain/entities/app.entity.ts';
import type { JobOutcomes } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

/** The choices of the filter of the jobs of an agent. */
export const JOB_FILTERS = ['all', 'active', 'completed', 'failed', 'cancelled'] as const;
export type JobFilterKey = (typeof JOB_FILTERS)[number];

/** The states that each choice asks the server for. An orphaned job failed. */
export const JOB_FILTER_STATUSES: Record<JobFilterKey, readonly Exclude<JobStatus, 'unknown'>[]> = {
  all: [],
  active: ['pending', 'awaiting_approval', 'running'],
  completed: ['completed'],
  failed: ['failed', 'orphaned'],
  cancelled: ['cancelled'],
};

const FILTER_LABELS = {
  all: messages.filterAll,
  active: messages.filterActive,
  completed: messages.passed,
  failed: messages.failed,
  cancelled: messages.cancelled,
};

export interface JobFilterChoice {
  value: JobFilterKey;
  label: string;
  /** `undefined` with no stats. */
  count?: number;
}

/**
 * The choices of the filter, with the ended jobs since the agent joined (`outcomes`) and the jobs
 * that run now. Without the stats, the choices have no count.
 */
export const jobFilterChoices = (
  outcomes: JobOutcomes | undefined,
  running: number,
): JobFilterChoice[] => {
  const counts: Record<JobFilterKey, number> | null = outcomes
    ? {
        all:
          outcomes.completed + outcomes.failed + outcomes.cancelled + outcomes.orphaned + running,
        active: running,
        completed: outcomes.completed,
        failed: outcomes.failed + outcomes.orphaned,
        cancelled: outcomes.cancelled,
      }
    : null;
  return JOB_FILTERS.map(value => ({
    value,
    label: t(FILTER_LABELS[value]),
    ...(counts && { count: counts[value] }),
  }));
};

const STATUS_LABELS = {
  pending: messages.pending,
  running: messages.running,
  completed: messages.passed,
  failed: messages.failed,
  cancelled: messages.cancelled,
  orphaned: messages.orphaned,
  awaiting_approval: getStatusConfig('awaiting_approval').label,
  unknown: messages.unknown,
};

/** The name of the state of a job. */
export const jobStatusLabel = (status: JobStatus): string => t(STATUS_LABELS[status]);

/** From the start to the end of a job, `null` while it did not end. */
export const jobDuration = (job: Pick<AppJob, 'startedAt' | 'finishedAt'>): string | null => {
  if (!job.startedAt || !job.finishedAt) return null;
  const seconds = Math.max(
    0,
    Math.round((Date.parse(job.finishedAt) - Date.parse(job.startedAt)) / 1000),
  );
  return formatDuration(seconds);
};
