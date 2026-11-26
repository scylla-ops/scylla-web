import { Permission, can } from '@platform/authz';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { JobReports, RetryJobReportInput } from '../domain/entities/vcs-report.entity.ts';
import type { IntegrationsModule } from '../integrations.module.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').vcsReportRepository;

/** The server reads at most 100 jobs in one call. */
export const MAX_JOBS_PER_REPORT_CALL = 100;

const VCS_REPORTS_QUERY_KEY = ['vcs-reports'] as const;

export const vcsReportQueries = {
  /**
   * The ids are sorted in the key: the same jobs in another order share one entry. The pages of
   * `jobs` read it: `list_job_reports` is in the cell `jobs.view` of the current project.
   * `version` is in the key, for example the status of the job: the server changes a report in
   * the transaction that changes its job, thus a new version reads the reports again at once.
   */
  byJobs: (jobIds: readonly string[], enabled = true, version = '') => {
    const ids = [...jobIds].sort().slice(0, MAX_JOBS_PER_REPORT_CALL);
    return queryOptions({
      queryKey: [...VCS_REPORTS_QUERY_KEY, ids, version] as const,
      queryFn: () => repository().listByJobs(ids),
      enabled: enabled && ids.length > 0 && can(Permission.READ_JOB),
      staleTime: 10 * 1000,
      // A new version has no data yet: the old reports stay on screen until the new read.
      placeholderData: (previous: JobReports[] | undefined) => previous,
    });
  },
};

export const vcsReportMutations = {
  retry: () =>
    mutationOptions({
      mutationFn: (input: RetryJobReportInput) => repository().retry(input),
      onSuccess: () => getQueryClient().invalidateQueries({ queryKey: VCS_REPORTS_QUERY_KEY }),
    }),
};
