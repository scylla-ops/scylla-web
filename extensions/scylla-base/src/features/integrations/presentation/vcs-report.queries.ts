import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import type { RetryJobReportInput } from '../domain/entities/vcs-report.entity.ts';
import type { IntegrationsModule } from '../integrations.module.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof IntegrationsModule.domain>('integrations').vcsReportRepository;

/** The server reads at most 100 jobs in one call. */
export const MAX_JOBS_PER_REPORT_CALL = 100;

const VCS_REPORTS_QUERY_KEY = ['vcs-reports'] as const;

export const vcsReportQueries = {
  /** The ids are sorted in the key: the same jobs in another order share one entry. */
  byJobs: (jobIds: readonly string[], enabled = true) => {
    const ids = [...jobIds].sort().slice(0, MAX_JOBS_PER_REPORT_CALL);
    return queryOptions({
      queryKey: [...VCS_REPORTS_QUERY_KEY, ids] as const,
      queryFn: () => repository().listByJobs(ids),
      enabled: enabled && ids.length > 0,
      staleTime: 10 * 1000,
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
