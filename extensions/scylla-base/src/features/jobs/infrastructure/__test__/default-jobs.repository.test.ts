// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { IJobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import type { JobLogEntry, TailJobLogsResponse } from '@base/generated/scylla/job/v1/job.ts';
import { LogStream } from '@base/generated/scylla/common/v1/common.ts';
import { DefaultJobsRepository } from '../default-jobs.repository.ts';

const entry: JobLogEntry = {
  jobLogId: { value: 'log-1' },
  jobId: { value: 'job-1' },
  nodeId: { value: 'node-1' },
  stream: LogStream.STDOUT,
  line: 'hello',
  timestamp: { seconds: 1735689600n, nanos: 0 },
};

/** A client whose `tailJobLogs` streams `responses`, and records the abort signal it gets. */
const tailing = (responses: () => AsyncGenerator<TailJobLogsResponse>) => {
  const seen: { signal?: AbortSignal } = {};
  const client = {
    tailJobLogs: (_input: unknown, options?: { abort?: AbortSignal }) => {
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

describe('DefaultJobsRepository.tailLogs', () => {
  it('maps each streamed entry to a domain log, and skips the events without one', async () => {
    const { client } = tailing(async function* () {
      await Promise.resolve();
      yield { log: entry };
      yield { log: undefined };
    });

    const stream = new DefaultJobsRepository(client).tailLogs('job-1').unwrap();
    const logs = (await collect(stream.logs)).map(result => result.unwrap());

    expect(logs).toEqual([
      {
        id: 'log-1',
        jobId: 'job-1',
        nodeId: 'node-1',
        stream: 'stdout',
        line: 'hello',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('ends the stream with an error item when the call breaks, instead of throwing', async () => {
    const { client } = tailing(async function* () {
      await Promise.resolve();
      yield { log: entry };
      throw new Error('connection reset');
    });

    const stream = new DefaultJobsRepository(client).tailLogs('job-1').unwrap();
    const results = await collect(stream.logs);

    expect(results).toHaveLength(2);
    expect(() => results[1].unwrap()).toThrow('Error tailing job logs');
  });

  it('aborts the call on cancel', () => {
    const { client, seen } = tailing(async function* () {});

    new DefaultJobsRepository(client).tailLogs('job-1').unwrap().cancel();

    expect(seen.signal?.aborted).toBe(true);
  });
});
