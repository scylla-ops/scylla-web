import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import type { DomainRegistry } from '@scylla/core-sdk';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import type { JobReports, VcsReport } from '@base/features/integrations';
import type { JobEntity, JobSource } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import JobDetailsPage from './JobDetails.page.svelte';

/** The Git context of a job on its page: its commit, its approval, its file, its checkout, its reports. */

vi.mock('../jobs-log/JobLogDisplay/JobLogDisplay.svelte', async () => ({
  default: (await import('./JobLogDisplay.stub.svelte')).default,
}));

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const source = (overrides: Partial<JobSource> = {}): JobSource => ({
  provider: 'github',
  repository: 'acme/api',
  repositoryUrl: 'https://github.com/acme/api',
  sha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  commitUrl: 'https://github.com/acme/api/commit/a1b2c3d',
  branch: 'feature/login',
  tag: '',
  pullRequests: [
    { number: 42, title: 'Add login form', url: 'https://github.com/acme/api/pull/42' },
  ],
  fromFork: false,
  forkRepository: '',
  authorLogin: 'lea-martin',
  authorAvatarUrl: '',
  title: 'Add login form validation',
  event: 'pull_request',
  ...overrides,
});

const job = (overrides: Partial<JobEntity> = {}): JobEntity => ({
  id: 'job-1',
  pipelineId: 'pipeline-1',
  status: 'completed',
  nodeExecutions: [
    { id: 'build', state: 'completed', attempts: 1, maxAttempts: 1 },
    { id: 'test', state: 'completed', attempts: 1, maxAttempts: 1 },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:01:00.000Z',
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:45.000Z',
  source: source(),
  ...overrides,
});

const report = (overrides: Partial<VcsReport> = {}): VcsReport => ({
  jobId: 'job-1',
  provider: 'github',
  mode: 'check_run',
  context: 'scylla/build',
  state: 'sent',
  sentState: 'success',
  sentAt: '2026-01-01T00:01:00.000Z',
  attempts: 0,
  error: '',
  externalUrl: 'https://github.com/acme/api/runs/7',
  ...overrides,
});

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: (() => void) | null = null;
let navigator: ReturnType<typeof installTestNavigator>;
let approve: ReturnType<typeof vi.fn>;
let reject: ReturnType<typeof vi.fn>;
let reports: { listByJobs: ReturnType<typeof vi.fn>; retry: ReturnType<typeof vi.fn> };

const grant = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all'
              ? { kind: 'fullControl' }
              : { kind: 'restricted', permissions },
        },
      ],
    },
  });

/** `ListJobReports` gives `listed` for the job. */
interface PageSetup {
  search?: string;
  listed?: VcsReport[];
  noReportReason?: string;
  registry?: DomainRegistry;
}

const renderPage = async (
  shown: JobEntity,
  { search = '', listed = [], noReportReason = '', registry = {} }: PageSetup = {},
) => {
  approve = vi.fn().mockResolvedValue({ ...shown, status: 'pending', approval: undefined });
  reject = vi.fn().mockResolvedValue({ ...shown, status: 'cancelled', approval: undefined });
  reports = {
    listByJobs: vi
      .fn()
      .mockResolvedValue([
        { jobId: 'job-1', reports: listed, noReportReason } satisfies JobReports,
      ]),
    retry: vi.fn().mockResolvedValue(report()),
  };
  restoreRegistry = withRegistry({
    ...registry,
    integrations: { vcsReportRepository: reports },
    jobs: {
      jobsRepository: {
        getById: vi.fn().mockResolvedValue(shown),
        approve,
        reject,
      } as unknown as JobsRepository,
    },
  });
  navigator = installTestNavigator({
    pathname: '/acme/projects/p1/pipelines/pipeline-1/jobs/job-1',
    search,
  });

  render(JobDetailsPage, { jobId: 'job-1' });
  await screen.findByRole('heading', { name: 'Job' });
};

const sourceBand = () => screen.getByRole('region', { name: 'Source' });

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  cache = withQueryClient();
  grant('all');
});

afterEach(() => {
  cache.restore();
  restoreRegistry?.();
  restoreRegistry = null;
  navigator?.restore();
  permissionsStore.setState({ permissions: null });
});

describe('JobDetailsPage, the Git context', () => {
  it('shows the commit of the job and links each part to the provider', async () => {
    await renderPage(
      job({
        pipelineFile: {
          path: '.scylla/pipelines/build.toml',
          commitSha: 'a1b2c3d4e5f6',
          url: 'https://github.com/acme/api/blob/a1b2c3d/.scylla/pipelines/build.toml',
        },
      }),
    );

    const band = sourceBand();
    expect(within(band).getByRole('link', { name: 'acme/api' })).toHaveAttribute(
      'href',
      'https://github.com/acme/api',
    );
    expect(band).toHaveTextContent('feature/login');
    expect(band).toHaveTextContent('a1b2c3d');
    expect(
      within(band).getByRole('link', { name: 'Add login form validation' }),
    ).toHaveAttribute('href', 'https://github.com/acme/api/commit/a1b2c3d');
    expect(within(band).getByRole('link', { name: '#42' })).toHaveAttribute(
      'href',
      'https://github.com/acme/api/pull/42',
    );
    expect(band).toHaveTextContent('lea-martin');
    expect(band).toHaveTextContent('Pull request #42');
    expect(
      within(band).getByRole('link', { name: '.scylla/pipelines/build.toml @ a1b2c3d' }),
    ).toBeInTheDocument();
  });

  it('shows no Git context for a job with no commit, and reads no report', async () => {
    await renderPage(job({ source: undefined }));

    expect(screen.queryByRole('region', { name: 'Source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Report' })).not.toBeInTheDocument();
    expect(reports.listByJobs).not.toHaveBeenCalled();
  });

  it('marks a job from a fork, and that it gets no secret', async () => {
    await renderPage(
      job({ source: source({ fromFork: true, forkRepository: 'octocat/api', branch: 'patch-1' }) }),
    );

    const band = sourceBand();
    expect(band).toHaveTextContent('octocat:patch-1');
    expect(band).toHaveTextContent('octocat/api');
    expect(band).toHaveTextContent('withheld');
    expect(band).toHaveTextContent('Pull request #42 from a fork');
  });

  describe('a job from a fork that waits', () => {
    const waiting = () =>
      job({
        status: 'awaiting_approval',
        startedAt: undefined,
        finishedAt: undefined,
        nodeExecutions: [{ id: 'build', state: 'pending', attempts: 0, maxAttempts: 1 }],
        source: source({ fromFork: true, forkRepository: 'octocat/api' }),
        approval: {
          state: 'waiting',
          changesPipelineFiles: true,
          changesUrl: 'https://github.com/acme/api/pull/42/files',
        },
      });

    const block = () => screen.queryByRole('region', { name: 'This run comes from a fork' });

    it('runs when an editor approves it', async () => {
      await renderPage(waiting());

      expect(block()).toHaveTextContent('This pull request changes a pipeline file in .scylla/.');
      expect(
        within(block()!).getByRole('link', { name: 'View changes on GitHub' }),
      ).toHaveAttribute('href', 'https://github.com/acme/api/pull/42/files');
      expect(screen.getByText('Waiting for approval')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Approve and run' }));

      await waitFor(() => expect(approve).toHaveBeenCalledWith('job-1'));
      await waitFor(() => expect(block()).not.toBeInTheDocument());
    });

    it('is cancelled when an editor rejects it', async () => {
      await renderPage(waiting());

      await userEvent.click(screen.getByRole('button', { name: 'Reject' }));

      await waitFor(() => expect(reject).toHaveBeenCalledWith('job-1'));
      await waitFor(() => expect(block()).not.toBeInTheDocument());
    });

    it('offers no decision without the approval of a job (APPROVE_JOB), and tells who decides', async () => {
      grant([Permission.READ_JOB, Permission.READ_JOB_LOGS]);

      await renderPage(waiting());

      expect(screen.queryByRole('button', { name: 'Approve and run' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
      expect(
        screen.getByText('Only an editor of the project can approve this run.'),
      ).toBeInTheDocument();
    });
  });

  it('tells who approved a job from a fork', async () => {
    const userRepository = {
      getById: vi.fn().mockResolvedValue({ id: 'user-1', username: 'lea', displayName: 'Lea' }),
    };
    await renderPage(
      job({
        source: source({ fromFork: true, forkRepository: 'octocat/api' }),
        approval: {
          state: 'approved',
          decidedBy: 'user-1',
          decidedAt: '2026-01-01T10:42:00.000Z',
          changesPipelineFiles: false,
          changesUrl: '',
        },
      }),
      { registry: { user: { userRepository } } },
    );

    await waitFor(() => expect(sourceBand()).toHaveTextContent(/Approved by Lea at /));
    expect(
      screen.queryByRole('region', { name: 'This run comes from a fork' }),
    ).not.toBeInTheDocument();
  });

  it('shows the errors of an invalid pipeline file in place of the reason of the failure', async () => {
    await renderPage(
      job({
        status: 'failed',
        error: 'invalid pipeline file',
        nodeExecutions: [],
        pipelineFile: {
          path: '.scylla/pipelines/build.toml',
          commitSha: '3a4b5c6d7e8f',
          url: 'https://github.com/acme/api/blob/3a4b5c6/.scylla/pipelines/build.toml',
        },
        fileErrors: [
          {
            path: '.scylla/pipelines/build.toml',
            line: 14,
            column: 12,
            field: 'nodes[2].needs[0]',
            message: '"tset" is not a node',
            warning: false,
          },
        ],
      }),
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid pipeline file');
    expect(alert).toHaveTextContent('.scylla/pipelines/build.toml:14:12');
    expect(alert).toHaveTextContent('nodes[2].needs[0]: "tset" is not a node');
    expect(alert).not.toHaveTextContent('The job failed');
    expect(within(alert).getByRole('link', { name: 'View file at 3a4b5c6' })).toHaveAttribute(
      'href',
      'https://github.com/acme/api/blob/3a4b5c6/.scylla/pipelines/build.toml',
    );
  });

  it('shows the checkout as the first step, built in, and opens its log', async () => {
    await renderPage(
      job({
        checkout: {
          state: 'completed',
          startedAt: '2026-01-01T00:00:00.000Z',
          finishedAt: '2026-01-01T00:00:03.000Z',
        },
      }),
      { search: '?nodes=.checkout' },
    );

    const steps = within(screen.getByRole('navigation', { name: 'Node executions' }))
      .getAllByRole('button')
      .slice(1)
      .map(button => button.textContent?.replace(/\s+/g, ' ').trim());
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatch(/^checkout built in /);
    expect(screen.getAllByTestId('job-log-display').map(panel => panel.textContent?.trim())).toEqual(
      ['logs for job-1/.checkout'],
    );
    expect(screen.getByRole('region', { name: 'checkout' })).toBeInTheDocument();
  });

  describe('the reports', () => {
    const band = () => screen.findByRole('region', { name: 'Report' });

    it('shows a report that the provider got, with a link to it', async () => {
      await renderPage(job(), { listed: [report()] });

      const reportBand = await band();
      expect(reportBand).toHaveTextContent('GitHub check scylla/build');
      expect(reportBand).toHaveTextContent(/Success sent at /);
      expect(within(reportBand).getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
        'href',
        'https://github.com/acme/api/runs/7',
      );
      expect(
        within(reportBand).queryByRole('button', { name: 'Retry now' }),
      ).not.toBeInTheDocument();
    });

    it('sends a report that waits for a new attempt now', async () => {
      await renderPage(job(), {
        listed: [
          report({
            state: 'retrying',
            attempts: 3,
            nextAttemptAt: '2999-01-01T00:00:00.000Z',
            error: 'GitHub answered 502 Bad Gateway.',
            externalUrl: '',
          }),
        ],
      });

      const reportBand = await band();
      expect(reportBand).toHaveTextContent(/attempt 3 of 10/);
      expect(reportBand).toHaveTextContent('GitHub answered 502 Bad Gateway.');

      await userEvent.click(within(reportBand).getByRole('button', { name: 'Retry now' }));

      await waitFor(() =>
        expect(reports.retry).toHaveBeenCalledWith({ jobId: 'job-1', context: 'scylla/build' }),
      );
    });

    it('sends to the Integrations page when a report was not sent', async () => {
      await renderPage(job(), {
        listed: [
          report({
            state: 'not_sent',
            error: 'The GitHub App was uninstalled from acme.',
            externalUrl: '',
          }),
        ],
      });

      const reportBand = await band();
      expect(reportBand).toHaveTextContent('Not sent');
      expect(reportBand).toHaveTextContent('The GitHub App was uninstalled from acme.');
      expect(
        within(reportBand).getByRole('link', { name: 'Fix the connection' }),
      ).toHaveAttribute('href', expect.stringMatching(/\/settings\/integrations$/));
      expect(within(reportBand).getByRole('button', { name: 'Retry now' })).toBeInTheDocument();
    });

    it('offers no retry and no repair to a reader of the job', async () => {
      grant([Permission.READ_JOB, Permission.READ_JOB_LOGS]);

      await renderPage(job(), {
        listed: [report({ state: 'not_sent', error: 'boom', externalUrl: '' })],
      });

      const reportBand = await band();
      expect(
        within(reportBand).queryByRole('button', { name: 'Retry now' }),
      ).not.toBeInTheDocument();
      expect(
        within(reportBand).queryByRole('link', { name: 'Fix the connection' }),
      ).not.toBeInTheDocument();
    });

    it('says why a job with a commit has no report', async () => {
      await renderPage(job(), { noReportReason: 'REPORTS_OFF' });

      const reportBand = await band();
      expect(reportBand).toHaveTextContent('Not reported');
      expect(reportBand).toHaveTextContent('Reports are off.');
    });
  });
});
