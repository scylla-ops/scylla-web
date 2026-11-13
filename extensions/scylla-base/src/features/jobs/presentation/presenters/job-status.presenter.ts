import type { MessageDescriptor } from '@lingui/core';
import { getStatusConfig, type StatusConfig } from '@shared/utils/status-config.ts';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import { jobGitMessages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

/** A job that failed on its pipeline file ran no node: it has its own label. */
export const hasInvalidFile = (job: JobEntity): boolean =>
  job.status === 'failed' && (job.fileErrors?.length ?? 0) > 0;

/** The look of the status of a job, with the label of an invalid file. */
export const statusConfigOf = (job: JobEntity): StatusConfig => {
  const config = getStatusConfig(job.status);
  return hasInvalidFile(job) ? { ...config, label: jobGitMessages.invalidFile } : config;
};

/** Why a job does not run yet, or why it stopped. `null` when the status tells all. */
export const statusHintOf = (job: JobEntity): MessageDescriptor | null => {
  switch (job.status) {
    case 'pending':
      return job.waitingReason === 'NO_AGENT_WITH_CHECKOUT'
        ? jobGitMessages.noAgentWithCheckout
        : jobsMessages.queuedHint;
    case 'awaiting_approval':
      return jobGitMessages.waitingForEditor;
    case 'orphaned':
      return jobsMessages.orphanedHint;
    default:
      return null;
  }
};
