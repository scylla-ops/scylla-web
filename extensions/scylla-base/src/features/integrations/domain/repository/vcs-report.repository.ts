import type { JobReports, RetryJobReportInput, VcsReport } from '../entities/vcs-report.entity.ts';

export interface VcsReportRepository {
  /** At most 100 jobs. A job that the caller cannot read is not in the answer. */
  listByJobs(jobIds: string[]): Promise<JobReports[]>;
  retry(input: RetryJobReportInput): Promise<VcsReport>;
}
