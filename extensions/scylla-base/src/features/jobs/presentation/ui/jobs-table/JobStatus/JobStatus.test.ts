import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobStatus as Status } from '@shared/domain/structs/job-status.struct.ts';
import JobStatus from './JobStatus.svelte';

const job = (status: Status, overrides: Partial<JobEntity> = {}): JobEntity => ({
  id: 'job-1',
  pipelineId: 'pipeline-1',
  status,
  nodeExecutions: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:01:00.000Z',
  ...overrides,
});

describe('JobStatus', () => {
  it('shows the status label', () => {
    render(JobStatus, { job: job('completed') });
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('adds a "queued" hint only for a pending job', () => {
    render(JobStatus, { job: job('pending') });
    expect(screen.getByText('queued: waiting for an agent')).toBeInTheDocument();
  });

  it('adds a "disconnected" hint only for an orphaned job', () => {
    render(JobStatus, { job: job('orphaned') });
    expect(screen.getByText('agent disconnected mid-run')).toBeInTheDocument();
  });

  it('shows no extra hint for a running, completed or failed job', () => {
    for (const status of ['running', 'completed', 'failed'] as const) {
      const { unmount } = render(JobStatus, { job: job(status) });

      expect(screen.queryByText('queued: waiting for an agent')).not.toBeInTheDocument();
      expect(screen.queryByText('agent disconnected mid-run')).not.toBeInTheDocument();

      unmount();
    }
  });

  it('shows a status newer than this build as unknown, without the pending hint', () => {
    // A status this build does not know is not "queued".
    render(JobStatus, { job: job('unknown') });

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByText('queued: waiting for an agent')).not.toBeInTheDocument();
  });

  it('shows a job from a fork that waits, and who it waits for', () => {
    render(JobStatus, { job: job('awaiting_approval') });

    expect(screen.getByText('Waiting for approval')).toBeInTheDocument();
    expect(screen.getByText('waiting for a project editor')).toBeInTheDocument();
  });

  it('says that no agent can get the code of a job that waits for one', () => {
    render(JobStatus, { job: job('pending', { waitingReason: 'NO_AGENT_WITH_CHECKOUT' }) });

    expect(
      screen.getByText('no agent with Git and checkout support is online'),
    ).toBeInTheDocument();
    expect(screen.queryByText('queued: waiting for an agent')).not.toBeInTheDocument();
  });

  it('shows a job that failed on its pipeline file as an invalid pipeline file', () => {
    const fileError = {
      path: '.scylla/pipelines/build.toml',
      line: 14,
      column: 12,
      field: 'nodes[2].needs[0]',
      message: '"tset" is not a node',
      warning: false,
    };
    render(JobStatus, { job: job('failed', { fileErrors: [fileError] }) });

    expect(screen.getByText('Invalid pipeline file')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });
});
