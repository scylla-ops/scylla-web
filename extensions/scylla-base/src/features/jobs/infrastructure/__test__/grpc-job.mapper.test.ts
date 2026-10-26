// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as grpcJob from '../grpc-job.mapper.ts';
import { JobOutcome, NodeOutcome } from '@base/generated/scylla/job/v1/job.ts';
import type { Job, JobNode, JobLogEntry } from '@base/generated/scylla/job/v1/job.ts';
import { LogStream } from '@base/generated/scylla/common/v1/common.ts';

const TS = { seconds: 1735689600n, nanos: 0 };

const baseJob = (overrides: Partial<Job> = {}): Job => ({
  jobId: { value: 'job-1' },
  pipelineId: { value: 'pipeline-1' },
  nodeExecutions: [],
  createdAt: TS,
  updatedAt: TS,
  state: { oneofKind: 'pending', pending: {} },
  origin: { oneofKind: undefined },
  ...overrides,
});

describe('grpcJob.toDomain', () => {
  it('unwraps the ids and formats the timestamps', () => {
    const domain = grpcJob.toDomain(baseJob());
    expect(domain.id).toBe('job-1');
    expect(domain.pipelineId).toBe('pipeline-1');
    expect(domain.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(domain.updatedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('a pending job has no startedAt/finishedAt', () => {
    const domain = grpcJob.toDomain(baseJob({ state: { oneofKind: 'pending', pending: {} } }));
    expect(domain.status).toBe('pending');
    expect(domain.startedAt).toBeUndefined();
    expect(domain.finishedAt).toBeUndefined();
  });

  it('a running job surfaces its startedAt, still no finishedAt', () => {
    const domain = grpcJob.toDomain(
      baseJob({ state: { oneofKind: 'running', running: { startedAt: TS } } }),
    );
    expect(domain.status).toBe('running');
    expect(domain.startedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(domain.finishedAt).toBeUndefined();
  });

  it.each([
    [JobOutcome.COMPLETED, 'completed'],
    [JobOutcome.FAILED, 'failed'],
    [JobOutcome.CANCELLED, 'cancelled'],
    [JobOutcome.ORPHANED, 'orphaned'],
  ])('a terminal job with outcome %i maps to status "%s"', (outcome, status) => {
    const domain = grpcJob.toDomain(
      baseJob({
        state: { oneofKind: 'terminal', terminal: { outcome, startedAt: TS, finishedAt: TS } },
      }),
    );
    expect(domain.status).toBe(status);
    expect(domain.startedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(domain.finishedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('an UNSPECIFIED outcome, or a state arm newer than this build, maps to "unknown" rather than a guess', () => {
    expect(
      grpcJob.toDomain(
        baseJob({
          state: { oneofKind: 'terminal', terminal: { outcome: JobOutcome.UNSPECIFIED } },
        }),
      ).status,
    ).toBe('unknown');

    expect(grpcJob.toDomain(baseJob({ state: { oneofKind: undefined } })).status).toBe('unknown');
  });

  it('a terminal job cancelled before it ever started has no startedAt (only finishedAt)', () => {
    const domain = grpcJob.toDomain(
      baseJob({
        state: {
          oneofKind: 'terminal',
          terminal: { outcome: JobOutcome.CANCELLED, finishedAt: TS },
        },
      }),
    );
    expect(domain.startedAt).toBeUndefined();
    expect(domain.finishedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  describe('node executions', () => {
    const node = (execution: JobNode['execution'], nodeId = 'node-1'): JobNode => ({
      nodeId: { value: nodeId },
      execution,
    });

    it('maps a pending node with no timestamps', () => {
      const [n] = grpcJob.toDomain(
        baseJob({ nodeExecutions: [node({ oneofKind: 'pending', pending: {} })] }),
      ).nodeExecutions;
      expect(n).toEqual({
        id: 'node-1',
        state: 'pending',
        startedAt: undefined,
        finishedAt: undefined,
      });
    });

    it('maps a running node with its startedAt', () => {
      const [n] = grpcJob.toDomain(
        baseJob({ nodeExecutions: [node({ oneofKind: 'running', running: { startedAt: TS } })] }),
      ).nodeExecutions;
      expect(n.state).toBe('running');
      expect(n.startedAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it.each([
      [NodeOutcome.COMPLETED, 'completed'],
      [NodeOutcome.FAILED, 'failed'],
      [NodeOutcome.CANCELLED, 'cancelled'],
      [NodeOutcome.SKIPPED, 'skipped'],
    ])('a finished node with outcome %i maps to state "%s"', (outcome, state) => {
      const [n] = grpcJob.toDomain(
        baseJob({
          nodeExecutions: [
            node({ oneofKind: 'finished', finished: { outcome, startedAt: TS, finishedAt: TS } }),
          ],
        }),
      ).nodeExecutions;
      expect(n.state).toBe(state);
      expect(n.startedAt).toBe('2025-01-01T00:00:00.000Z');
      expect(n.finishedAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('an execution arm newer than this build maps to "unknown"', () => {
      const [n] = grpcJob.toDomain(
        baseJob({ nodeExecutions: [node({ oneofKind: undefined })] }),
      ).nodeExecutions;
      expect(n.state).toBe('unknown');
    });

    it('preserves node order and count', () => {
      const domain = grpcJob.toDomain(
        baseJob({
          nodeExecutions: [
            node({ oneofKind: 'pending', pending: {} }, 'a'),
            node({ oneofKind: 'pending', pending: {} }, 'b'),
          ],
        }),
      );
      expect(domain.nodeExecutions.map(n => n.id)).toEqual(['a', 'b']);
    });
  });
});

describe('grpcJob.toDomainList', () => {
  it('maps every job and carries the pagination metadata through as-is', () => {
    const pagination = {
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };
    const result = grpcJob.toDomainList({ jobs: [baseJob()], pagination });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('job-1');
    expect(result.pagination).toBe(pagination);
  });
});

describe('grpcJob.logEntryToDomain', () => {
  const entry = (overrides: Partial<JobLogEntry> = {}): JobLogEntry => ({
    jobLogId: { value: 'log-1' },
    jobId: { value: 'job-1' },
    nodeId: { value: 'node-1' },
    stream: LogStream.STDOUT,
    line: 'hello',
    timestamp: TS,
    ...overrides,
  });

  it('unwraps ids, resolves the stream, and formats the timestamp', () => {
    const log = grpcJob.logEntryToDomain(entry());
    expect(log).toEqual({
      id: 'log-1',
      jobId: 'job-1',
      nodeId: 'node-1',
      stream: 'stdout',
      line: 'hello',
      timestamp: '2025-01-01T00:00:00.000Z',
    });
  });

  it('maps STDERR to "stderr"', () => {
    expect(grpcJob.logEntryToDomain(entry({ stream: LogStream.STDERR })).stream).toBe('stderr');
  });

  it('maps UNSPECIFIED (or a future stream) to an empty string', () => {
    expect(grpcJob.logEntryToDomain(entry({ stream: LogStream.UNSPECIFIED })).stream).toBe('');
  });
});

describe('grpcJob.logsToDomainList', () => {
  it('maps every log entry and carries the pagination through', () => {
    const pagination = {
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };
    const result = grpcJob.logsToDomainList({
      logs: [
        {
          jobLogId: { value: 'log-1' },
          jobId: { value: 'job-1' },
          nodeId: { value: 'node-1' },
          stream: LogStream.STDOUT,
          line: 'hello',
          timestamp: TS,
        },
      ],
      pagination,
    });
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toBe(pagination);
  });
});
