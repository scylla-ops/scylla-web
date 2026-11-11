// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcJob from '../grpc-job.mapper.ts';
import {
  JobStatus,
  LogStream,
  NodeStatus,
  type Job,
  type NodeRun,
} from '@base/generated/scylla/pipelines/v1/job.ts';
import type { Node } from '@base/generated/scylla/pipelines/v1/pipeline.ts';

const TS = { seconds: 1735689600n, nanos: 0 };
const ISO = '2025-01-01T00:00:00.000Z';
const LATER = { seconds: 1735689660n, nanos: 0 };
const LATER_ISO = '2025-01-01T00:01:00.000Z';

const node = (id: string, retries = 0): Node => ({
  id,
  needs: [],
  step: { oneofKind: 'exec', exec: { argv: ['true'] } },
  env: [],
  timeoutSeconds: 0,
  retries,
  workingDir: '',
});

const run = (nodeId: string, status: NodeStatus, attempt: number, finished = false): NodeRun => ({
  nodeId,
  status,
  attempt,
  startedAt: TS,
  ...(finished && { finishedAt: LATER }),
  error: '',
});

const baseJob = (overrides: Partial<Job> = {}): Job => ({
  id: { value: 'job-1' },
  pipelineId: { value: 'pipeline-1' },
  status: JobStatus.PENDING,
  nodes: [],
  runs: [],
  error: '',
  createdAt: TS,
  fileErrors: [],
  waitingReason: '',
  ...overrides,
});

describe('grpcJob.toDomain', () => {
  it('keeps why the job failed and the agent that ran it', () => {
    const domain = grpcJob.toDomain(
      baseJob({
        status: JobStatus.FAILED,
        error: 'the node a failed: exit code 2',
        agentId: { value: 'agent-1' },
      }),
    );

    expect(domain.error).toBe('the node a failed: exit code 2');
    expect(domain.agentId).toBe('agent-1');
    expect(grpcJob.toDomain(baseJob()).error).toBeUndefined();
    expect(grpcJob.toDomain(baseJob()).agentId).toBeUndefined();
  });

  it('unwraps the ids and formats the times', () => {
    const domain = grpcJob.toDomain(baseJob());
    expect(domain).toMatchObject({
      id: 'job-1',
      pipelineId: 'pipeline-1',
      status: 'pending',
      createdAt: ISO,
      updatedAt: ISO,
    });
    expect(domain.startedAt).toBeUndefined();
    expect(domain.finishedAt).toBeUndefined();
  });

  it('takes the last time it knows as the time of the last change', () => {
    const domain = grpcJob.toDomain(
      baseJob({ status: JobStatus.COMPLETED, startedAt: TS, finishedAt: LATER }),
    );
    expect(domain).toMatchObject({ startedAt: ISO, finishedAt: LATER_ISO, updatedAt: LATER_ISO });
  });

  it.each([
    [JobStatus.PENDING, 'pending'],
    [JobStatus.RUNNING, 'running'],
    [JobStatus.COMPLETED, 'completed'],
    [JobStatus.FAILED, 'failed'],
    [JobStatus.CANCELLED, 'cancelled'],
    [JobStatus.ORPHANED, 'orphaned'],
    [JobStatus.UNSPECIFIED, 'unknown'],
    [99 as JobStatus, 'unknown'],
  ])('maps the status %i to "%s"', (status, expected) => {
    expect(grpcJob.toDomain(baseJob({ status })).status).toBe(expected);
  });

  describe('node executions', () => {
    it('gives a node with no run yet as pending, with one attempt more than its retries', () => {
      const [n] = grpcJob.toDomain(baseJob({ nodes: [node('build', 2)] })).nodeExecutions;
      expect(n).toEqual({
        id: 'build',
        state: 'pending',
        startedAt: undefined,
        finishedAt: undefined,
        attempts: 0,
        maxAttempts: 3,
      });
    });

    it('takes the last attempt of a node', () => {
      const [n] = grpcJob.toDomain(
        baseJob({
          nodes: [node('build', 2)],
          runs: [run('build', NodeStatus.FAILED, 1, true), run('build', NodeStatus.RUNNING, 2)],
        }),
      ).nodeExecutions;
      expect(n).toMatchObject({ state: 'running', attempts: 2, startedAt: ISO });
      expect(n.finishedAt).toBeUndefined();
    });

    it.each([
      [NodeStatus.COMPLETED, 'completed'],
      [NodeStatus.FAILED, 'failed'],
      [NodeStatus.SKIPPED, 'skipped'],
      [NodeStatus.CANCELLED, 'cancelled'],
      [NodeStatus.UNSPECIFIED, 'unknown'],
    ])('maps the node status %i to "%s"', (status, expected) => {
      const [n] = grpcJob.toDomain(
        baseJob({ nodes: [node('build')], runs: [run('build', status, 1, true)] }),
      ).nodeExecutions;
      expect(n).toMatchObject({ state: expected, finishedAt: LATER_ISO });
    });

    it('keeps the order and the count of the nodes of the job', () => {
      const executions = grpcJob.toDomain(
        baseJob({ nodes: [node('a'), node('b'), node('c')] }),
      ).nodeExecutions;
      expect(executions.map(e => e.id)).toEqual(['a', 'b', 'c']);
    });
  });
});

describe('grpcJob.toDomainPage', () => {
  const at = (id: string, seconds: bigint) =>
    baseJob({ id: { value: id }, createdAt: { seconds, nanos: 0 } });

  it('sorts the jobs newest first and cuts the page', () => {
    const page = grpcJob.toDomainPage([at('a', 1n), at('c', 3n), at('b', 2n)], {
      page: 2,
      pageSize: 2,
    });
    expect(page.items.map(item => item.id)).toEqual(['a']);
    expect(page.pagination).toEqual({
      totalCount: 3,
      page: 2,
      pageSize: 2,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
  });
});

describe('grpcJob.logLinesToDomain', () => {
  it('gives each line an id from the cursor and its place', () => {
    expect(
      grpcJob.logLinesToDomain('job-1', 'build', 'c-7', [
        { stream: LogStream.STDOUT, text: 'one', at: TS },
        { stream: LogStream.STDERR, text: 'two', at: TS },
        { stream: LogStream.UNSPECIFIED, text: 'three', at: TS },
      ]),
    ).toEqual([
      {
        id: 'c-7:0',
        jobId: 'job-1',
        nodeId: 'build',
        stream: 'stdout',
        line: 'one',
        timestamp: ISO,
      },
      {
        id: 'c-7:1',
        jobId: 'job-1',
        nodeId: 'build',
        stream: 'stderr',
        line: 'two',
        timestamp: ISO,
      },
      { id: 'c-7:2', jobId: 'job-1', nodeId: 'build', stream: '', line: 'three', timestamp: ISO },
    ]);
  });
});
