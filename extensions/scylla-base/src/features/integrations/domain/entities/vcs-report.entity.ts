import type { VcsProvider } from '../structs/vcs-provider.struct.ts';
import type { ReportMode } from './repository-link.entity.ts';

export type ReportState = 'sending' | 'sent' | 'retrying' | 'not_sent';

/** The report of one pipeline of a job to the provider. The job and the context designate it. */
export interface VcsReport {
  jobId: string;
  provider: VcsProvider;
  mode: ReportMode;
  /** For example scylla/build. */
  context: string;
  state: ReportState;
  /** The last state that the provider got, in its words. Empty before the first send. */
  sentState: string;
  sentAt?: string;
  attempts: number;
  nextAttemptAt?: string;
  /** A short text with no secret. Empty when the last call passed. */
  error: string;
  /** Empty before the first send. */
  externalUrl: string;
}

/** The reports of one job, or why the job has none. */
export interface JobReports {
  jobId: string;
  reports: VcsReport[];
  /** A stable code, for example NO_REPOSITORY_LINK. Empty when the job has reports. */
  noReportReason: string;
}

export interface RetryJobReportInput {
  jobId: string;
  context: string;
}
