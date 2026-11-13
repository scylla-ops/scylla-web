// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobEntity, JobSource } from '@base/features/jobs/domain/entities/job.entity.ts';
import { eventText, pullRequestLabel, refOf } from '../job-source.presenter.ts';
import { fileErrorPlace } from '../job-file.presenter.ts';
import { CHECKOUT_STEP_ID, stepsOf } from '../job-steps.presenter.ts';

const source = (overrides: Partial<JobSource> = {}): JobSource => ({
  provider: 'github',
  repository: 'acme/api',
  repositoryUrl: 'https://github.com/acme/api',
  sha: '4b5c6d7e8f904b5c6d7e8f904b5c6d7e8f904b5c',
  commitUrl: '',
  branch: 'feature/login',
  tag: '',
  pullRequests: [{ number: 42, title: 'Add login form', url: '' }],
  fromFork: false,
  forkRepository: '',
  authorLogin: 'lea-martin',
  authorAvatarUrl: '',
  title: 'Add login form validation',
  event: 'push',
  ...overrides,
});

describe('refOf', () => {
  it('gives the branch, with the owner of a fork before it', () => {
    expect(refOf(source())).toEqual({ kind: 'branch', name: 'feature/login' });
    expect(
      refOf(source({ fromFork: true, forkRepository: 'octocat/api', branch: 'patch-1' })),
    ).toEqual({ kind: 'branch', name: 'octocat:patch-1' });
  });

  it('gives the tag, and nothing for a run on a SHA', () => {
    expect(refOf(source({ branch: '', tag: 'v2.1.0' }))).toEqual({ kind: 'tag', name: 'v2.1.0' });
    expect(refOf(source({ branch: '', tag: '' }))).toBeNull();
  });
});

describe('pullRequestLabel', () => {
  it('writes a number as each provider does', () => {
    expect(pullRequestLabel('github', 128)).toBe('#128');
    expect(pullRequestLabel('gitlab', 17)).toBe('!17');
  });
});

describe('eventText', () => {
  const EVENTS: [Partial<JobSource>, string][] = [
    [{ event: 'push' }, 'Push'],
    [{ event: 'pull_request' }, 'Pull request #42'],
    [
      { event: 'pull_request', fromFork: true, forkRepository: 'octocat/api' },
      'Pull request #42 from a fork',
    ],
    [
      { event: 'pull_request', provider: 'gitlab', pullRequests: [{ number: 17, title: '', url: '' }] },
      'Merge request !17',
    ],
    [{ event: 'pull_request', pullRequests: [] }, 'Pull request'],
    [{ event: 'tag', branch: '', tag: 'v2.1.0' }, 'Push of the tag v2.1.0'],
    [{ event: 'manual', branch: 'release/2.1' }, 'Manual run on release/2.1'],
    [{ event: 'manual', branch: '' }, 'Manual run on 4b5c6d7'],
    [{ event: 'provider_rerun' }, 'Re-run requested on GitHub'],
    [{ event: 'provider_rerun', provider: 'gitlab' }, 'Re-run requested on GitLab'],
    [{ event: 'trigger' }, 'Trigger of Scylla'],
  ];

  it.each(EVENTS)('tells the event %o in words', (overrides, text) => {
    expect(eventText(source(overrides))).toBe(text);
  });

  it('tells nothing for an event newer than this build', () => {
    expect(eventText(source({ event: undefined }))).toBeNull();
  });
});

describe('fileErrorPlace', () => {
  const error = { path: '.scylla/build.toml', line: 14, column: 12, field: '', message: 'x', warning: false };

  it('writes the place of an error as a compiler does', () => {
    expect(fileErrorPlace(error)).toBe('.scylla/build.toml:14:12');
    expect(fileErrorPlace({ ...error, column: 0 })).toBe('.scylla/build.toml:14');
    expect(fileErrorPlace({ ...error, line: 0, column: 0 })).toBe('.scylla/build.toml');
    expect(fileErrorPlace({ ...error, path: '' })).toBe('');
  });
});

describe('stepsOf', () => {
  const job: JobEntity = {
    id: 'job-1',
    pipelineId: 'pipeline-1',
    status: 'running',
    nodeExecutions: [{ id: 'build', state: 'running', attempts: 1, maxAttempts: 1 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('puts the built-in checkout before the nodes', () => {
    const steps = stepsOf({
      ...job,
      checkout: { state: 'completed', startedAt: '2026-01-01T00:00:00.000Z' },
    });

    expect(steps.map(step => step.id)).toEqual([CHECKOUT_STEP_ID, 'build']);
    expect(steps[0]).toMatchObject({ state: 'completed', attempts: 0, maxAttempts: 1 });
  });

  it('gives the nodes alone for a job with no checkout', () => {
    expect(stepsOf(job)).toBe(job.nodeExecutions);
  });
});
