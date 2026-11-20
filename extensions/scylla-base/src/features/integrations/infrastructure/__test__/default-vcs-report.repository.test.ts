// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IVcsReportServiceClient } from '@base/generated/scylla/integrations/v1/vcs_report_service.client.ts';
import {
  ReportMode,
  ReportState,
  VcsProvider,
  type VcsReport,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultVcsReportRepository } from '../default-vcs-report.repository.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';

const wire = (patch: Partial<VcsReport> = {}): VcsReport => ({
  jobId: { value: 'j-1' },
  provider: VcsProvider.GITHUB,
  mode: ReportMode.CHECK_RUN,
  context: 'scylla/build',
  state: ReportState.RETRYING,
  sentState: 'in_progress',
  sentAt: TS,
  attempts: 3,
  nextAttemptAt: TS,
  error: '502 Bad Gateway',
  externalUrl: 'https://github.com/acme/api/runs/1',
  ...patch,
});

/** A fake client with only the calls of the test: `unaryCall` answers with a partial type. */
const repositoryWith = (client: object) =>
  new DefaultVcsReportRepository(client as IVcsReportServiceClient);

describe('DefaultVcsReportRepository', () => {
  it('calls nothing for no job', async () => {
    const listJobReports = vi.fn();

    expect(await repositoryWith({ listJobReports }).listByJobs([])).toEqual([]);
    expect(listJobReports).not.toHaveBeenCalled();
  });

  it('gives the reports of each job, or why a job has none', async () => {
    const listJobReports = vi.fn(() =>
      unaryCall({
        jobs: [
          { jobId: { value: 'j-1' }, reports: [wire()], noReportReason: '' },
          {
            jobId: { value: 'j-2' },
            reports: [],
            noReportReason: 'NO_REPOSITORY_LINK',
          },
        ],
      }),
    );

    const jobs = await repositoryWith({ listJobReports }).listByJobs(['j-1', 'j-2']);

    expect(listJobReports).toHaveBeenCalledWith({ jobIds: [{ value: 'j-1' }, { value: 'j-2' }] });
    expect(jobs[0].reports[0]).toEqual({
      jobId: 'j-1',
      provider: 'github',
      mode: 'check_run',
      context: 'scylla/build',
      state: 'retrying',
      sentState: 'in_progress',
      sentAt: ISO,
      attempts: 3,
      nextAttemptAt: ISO,
      error: '502 Bad Gateway',
      externalUrl: 'https://github.com/acme/api/runs/1',
    });
    expect(jobs[1]).toEqual({ jobId: 'j-2', reports: [], noReportReason: 'NO_REPOSITORY_LINK' });
  });

  it('retries one report of a job', async () => {
    const retryJobReport = vi.fn(() =>
      unaryCall({
        report: wire({ state: ReportState.SENDING, sentAt: undefined, nextAttemptAt: undefined }),
      }),
    );

    const report = await repositoryWith({ retryJobReport }).retry({
      jobId: 'j-1',
      context: 'scylla/build',
    });

    expect(retryJobReport).toHaveBeenCalledWith({
      jobId: { value: 'j-1' },
      context: 'scylla/build',
    });
    expect(report.state).toBe('sending');
    expect(report).not.toHaveProperty('sentAt');
    expect(report).not.toHaveProperty('nextAttemptAt');
  });
});
