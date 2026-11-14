import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { PermissionScope, permissionsStore } from '@platform/authz';
import type { JobReports, VcsReport } from '@base/features/integrations';
import type { JobEntity, JobSource } from '@base/features/jobs/domain/entities/job.entity.ts';
import JobsTable from './JobsTable.svelte';

const source = (overrides: Partial<JobSource> = {}): JobSource => ({
  provider: 'github',
  repository: 'acme/api',
  repositoryUrl: '',
  sha: '9f8e7d6c5b4a9f8e7d6c5b4a9f8e7d6c5b4a9f8e',
  commitUrl: '',
  branch: 'feature/login',
  tag: '',
  pullRequests: [
    { number: 42, title: '', url: '' },
    { number: 45, title: '', url: '' },
  ],
  fromFork: false,
  forkRepository: '',
  authorLogin: 'lea-martin',
  authorAvatarUrl: '',
  title: 'Refactor session store',
  event: 'pull_request',
  ...overrides,
});

const job = (id: string, overrides: Partial<JobEntity> = {}): JobEntity => ({
  id,
  pipelineId: 'pipeline-1',
  status: 'completed',
  nodeExecutions: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:01:00.000Z',
  ...overrides,
});

const notSent = (jobId: string): VcsReport => ({
  jobId,
  provider: 'github',
  mode: 'check_run',
  context: 'scylla/build',
  state: 'not_sent',
  sentState: '',
  attempts: 10,
  error: 'boom',
  externalUrl: '',
});

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let listByJobs: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cache = withQueryClient();
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  listByJobs = vi.fn((ids: string[]) =>
    Promise.resolve(
      ids.map((jobId): JobReports => ({ jobId, reports: [notSent(jobId)], noReportReason: '' })),
    ),
  );
  restoreRegistry = withRegistry({
    integrations: { vcsReportRepository: { listByJobs, retry: vi.fn() } },
    jobs: { jobsRepository: {} },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('JobsTable', () => {
  it('shows the commit of each job in a Source column, with the state of its report', async () => {
    render(JobsTable, {
      jobs: [job('job-1', { source: source() }), job('job-2')],
      pipelineId: 'pipeline-1',
    });

    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Refactor session store/ });
    expect(within(row).getByText('9f8e7d6')).toBeInTheDocument();
    expect(within(row).getByText('feature/login')).toBeInTheDocument();
    expect(within(row).getByText('#42')).toBeInTheDocument();
    expect(within(row).getByText('#45')).toBeInTheDocument();
    expect(await within(row).findByRole('img', { name: 'Report not sent' })).toBeInTheDocument();
    expect(listByJobs).toHaveBeenCalledWith(['job-1']);
  });

  it('puts the commit on two lines: the title, then the SHA with the state of its report, the ref and the PRs', async () => {
    render(JobsTable, { jobs: [job('job-1', { source: source() })], pipelineId: 'pipeline-1' });

    expect(screen.getByText('Refactor session store')).toHaveAttribute('title', 'Refactor session store');
    const sha = screen.getByText('9f8e7d6');
    expect(await within(sha).findByRole('img', { name: 'Report not sent' })).toBeInTheDocument();
    const line = sha.parentElement as HTMLElement;
    expect(within(line).getByText('feature/login')).toBeInTheDocument();
    expect(within(line).getByText('#42')).toBeInTheDocument();
  });

  it('fits a 900 px container with the Source column, so the page does not scroll sideways', () => {
    render(JobsTable, { jobs: [job('job-1', { source: source() })], pipelineId: 'pipeline-1' });

    expect(parseFloat(screen.getByRole('table').style.minWidth)).toBeLessThanOrEqual(900);
  });

  it('shows the branch of a fork with the owner of the fork', () => {
    render(JobsTable, {
      jobs: [
        job('job-1', {
          status: 'awaiting_approval',
          source: source({ fromFork: true, forkRepository: 'octocat/api', branch: 'patch-1' }),
        }),
      ],
      pipelineId: 'pipeline-1',
    });

    expect(screen.getByText('octocat:patch-1')).toBeInTheDocument();
    expect(screen.getByText('Waiting for approval')).toBeInTheDocument();
  });

  it('has no Source column and reads no report when no job has a commit', () => {
    render(JobsTable, { jobs: [job('job-1')], pipelineId: 'pipeline-1' });

    expect(screen.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument();
    expect(listByJobs).not.toHaveBeenCalled();
  });
});
