// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import { JobView } from '@base/generated/scylla/pipelines/v1/job_service.ts';
import { JobOrigin, JobStatus, type Job } from '@base/generated/scylla/pipelines/v1/job.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultJobsRepository } from '../default-jobs.repository.ts';

const job = (id: string): Job => ({
  id: { value: id },
  pipelineId: { value: 'pipeline-1' },
  status: JobStatus.RUNNING,
  nodes: [],
  runs: [],
  error: '',
  createdAt: { seconds: 1735689600n, nanos: 0 },
  fileErrors: [],
  waitingReason: '',
  origin: JobOrigin.UNSPECIFIED,
  unfitAgents: [],
});

describe('DefaultJobsRepository.getNewestByWorkspaceId', () => {
  it('reads one page of the summary view, with the statuses and the period', async () => {
    const listWorkspaceJobs = vi.fn(() => unaryCall({ jobs: [job('job-1')] }));
    const repository = new DefaultJobsRepository({ listWorkspaceJobs } as unknown as IJobServiceClient);

    const jobs = await repository.getNewestByWorkspaceId({
      workspaceId: 'org-1',
      statuses: ['running', 'awaiting_approval'],
      createdAfter: new Date('2026-11-16T00:00:00Z'),
      limit: 20,
    });

    expect(jobs.map(entry => entry.id)).toEqual(['job-1']);
    expect(listWorkspaceJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: { value: 'org-1' },
        page: { size: 20, token: '' },
        view: JobView.SUMMARY,
        filter: expect.objectContaining({
          statuses: [JobStatus.RUNNING, JobStatus.AWAITING_APPROVAL],
          createdAfter: { seconds: BigInt(Date.parse('2026-11-16T00:00:00Z') / 1000), nanos: 0 },
        }),
      }),
    );
    expect(listWorkspaceJobs.mock.calls[0]).not.toHaveProperty('0.filter.createdBefore');
  });
});

describe('DefaultJobsRepository.getStats', () => {
  it('sends the query and maps the figures', async () => {
    const getJobStats = vi.fn(() =>
      unaryCall({
        totals: { created: 2, outcomes: { completed: 1, failed: 1, cancelled: 0, orphaned: 0 } },
        buckets: [],
        groups: [],
        timeZone: 'Europe/Paris',
      }),
    );
    const repository = new DefaultJobsRepository({ getJobStats } as unknown as IJobServiceClient);

    const stats = await repository.getStats({
      workspaceId: 'org-1',
      from: new Date('2026-11-16T00:00:00Z'),
      to: null,
      compare: true,
    });

    expect(stats.totals.outcomes).toEqual({ completed: 1, failed: 1, cancelled: 0, orphaned: 0 });
    expect(getJobStats).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: { value: 'org-1' }, compare: true }),
    );
  });
});
