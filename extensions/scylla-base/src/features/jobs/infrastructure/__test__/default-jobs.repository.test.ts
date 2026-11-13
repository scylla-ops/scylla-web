// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import type { IJobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import type { TailJobLogsResponse } from '@base/generated/scylla/pipelines/v1/job_service.ts';
import { JobStatus, LogStream, type Job } from '@base/generated/scylla/pipelines/v1/job.ts';
import { SourceEvent } from '@base/generated/scylla/pipelines/v1/source.ts';
import { unaryCall } from '@test/grpc.ts';
import { DefaultJobsRepository } from '../default-jobs.repository.ts';

const response = (lines: string[]): TailJobLogsResponse => ({
  cursor: 'c-1',
  nodeId: 'node-1',
  lines: lines.map(text => ({
    stream: LogStream.STDOUT,
    text,
    at: { seconds: 1735689600n, nanos: 0 },
  })),
});

/** A client whose `tailJobLogs` streams `responses`, and records its input and abort signal. */
const tailing = (responses: () => AsyncGenerator<TailJobLogsResponse>) => {
  const seen: { signal?: AbortSignal; input?: unknown } = {};
  const client = {
    tailJobLogs: (input: unknown, options?: { abort?: AbortSignal }) => {
      seen.input = input;
      seen.signal = options?.abort;
      return { responses: responses() };
    },
  } as unknown as IJobServiceClient;
  return { client, seen };
};

const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
};

const job = (id: string, seconds: number): Job => ({
  id: { value: id },
  pipelineId: { value: 'pipeline-1' },
  status: JobStatus.COMPLETED,
  nodes: [],
  runs: [],
  error: '',
  createdAt: { seconds: BigInt(seconds), nanos: 0 },
  fileErrors: [],
  waitingReason: '',
});

describe('DefaultJobsRepository.tailLogs', () => {
  it('gives each line of each answer as a domain log', async () => {
    const { client, seen } = tailing(async function* () {
      await Promise.resolve();
      yield response(['hello', 'world']);
      yield response([]);
    });

    const logs = await collect(new DefaultJobsRepository(client).tailLogs('job-1', 'node-1').logs);

    expect(seen.input).toEqual({ jobId: { value: 'job-1' }, nodeId: 'node-1', after: '' });
    expect(logs).toEqual([
      {
        id: 'c-1:0',
        jobId: 'job-1',
        nodeId: 'node-1',
        stream: 'stdout',
        line: 'hello',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
      expect.objectContaining({ id: 'c-1:1', line: 'world' }),
    ]);
  });

  it('gives the lines read so far, then throws when the call breaks', async () => {
    const { client } = tailing(async function* () {
      await Promise.resolve();
      yield response(['hello']);
      throw new Error('connection reset');
    });

    const lines: string[] = [];
    const reading = (async () => {
      for await (const log of new DefaultJobsRepository(client).tailLogs('job-1').logs) {
        lines.push(log.line);
      }
    })();

    await expect(reading).rejects.toThrow('connection reset');
    expect(lines).toEqual(['hello']);
  });

  it('aborts the call on cancel', () => {
    const { client, seen } = tailing(async function* () {});

    new DefaultJobsRepository(client).tailLogs('job-1').cancel();

    expect(seen.signal?.aborted).toBe(true);
  });
});

describe('DefaultJobsRepository lists', () => {
  it('reads every page of a pipeline, newest first, then cuts the asked page', async () => {
    const listPipelineJobs = vi.fn(({ page }: { page: { token: string } }) =>
      unaryCall(
        page.token === ''
          ? { jobs: [job('old', 1)], page: { nextToken: 'n' } }
          : { jobs: [job('new', 2)], page: { nextToken: '' } },
      ),
    );
    const client = { listPipelineJobs } as unknown as IJobServiceClient;

    const list = await new DefaultJobsRepository(client).getByPipelineId('pipeline-1', {
      page: 1,
      pageSize: 1,
    });

    expect(listPipelineJobs).toHaveBeenCalledTimes(2);
    expect(list.items.map(item => item.id)).toEqual(['new']);
    expect(list.pagination).toMatchObject({ totalCount: 2, totalPages: 2, hasNext: true });
  });

  it('sends the filter with each page, and no filter when it has none', async () => {
    const listPipelineJobs = vi.fn((_request: { filter?: unknown }) =>
      unaryCall({ jobs: [], page: { nextToken: '' } }),
    );
    const repository = new DefaultJobsRepository({ listPipelineJobs } as unknown as IJobServiceClient);

    await repository.getByPipelineId('pipeline-1', { page: 1, pageSize: 10 });
    await repository.getByPipelineId('pipeline-1', { page: 1, pageSize: 10 }, { event: 'tag' });

    expect(listPipelineJobs.mock.calls.map(([request]) => request.filter)).toEqual([
      undefined,
      { branch: '', event: SourceEvent.TAG, authorLogin: '', pullRequest: 0 },
    ]);
  });
});

describe('DefaultJobsRepository actions', () => {
  it('gives the id of the new job of a rerun, and cancels a job', async () => {
    const client = {
      rerunJob: vi.fn(() => unaryCall({ job: job('job-2', 3) })),
      cancelJob: vi.fn(() => unaryCall({ job: job('job-1', 1) })),
    } as unknown as IJobServiceClient;
    const repository = new DefaultJobsRepository(client);

    await expect(repository.rerun('job-1')).resolves.toBe('job-2');
    await repository.cancel('job-1');

    expect(client.cancelJob).toHaveBeenCalledWith({ jobId: { value: 'job-1' } });
  });

  it('approves and rejects a job from a fork, and gives the job after the change', async () => {
    const client = {
      approveJob: vi.fn(() => unaryCall({ job: { ...job('job-1', 1), status: JobStatus.PENDING } })),
      rejectJob: vi.fn(() => unaryCall({ job: { ...job('job-1', 1), status: JobStatus.CANCELLED } })),
    } as unknown as IJobServiceClient;
    const repository = new DefaultJobsRepository(client);

    await expect(repository.approve('job-1')).resolves.toMatchObject({ status: 'pending' });
    await expect(repository.reject('job-1')).resolves.toMatchObject({ status: 'cancelled' });

    expect(client.approveJob).toHaveBeenCalledWith({ jobId: { value: 'job-1' } });
    expect(client.rejectJob).toHaveBeenCalledWith({ jobId: { value: 'job-1' } });
  });
});
