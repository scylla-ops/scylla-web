import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { setDependencyRegistry } from '@scylla/core-sdk';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { JobLog } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import { createTailJobLogs, type TailedLogs } from '../tail-job-logs.state.svelte.ts';

const JOB_ID = 'job-1';

/** A log stream this test drives: `push`, `fail`, `end`. */
const createControllableStream = () => {
  const queue: (JobLog | ScyllaError)[] = [];
  let wake: (() => void) | null = null;
  let ended = false;
  const cancel = vi.fn();

  const wakeUp = () => {
    const resume = wake;
    wake = null;
    resume?.();
  };

  async function* generator(): AsyncGenerator<JobLog> {
    let index = 0;
    for (;;) {
      if (index < queue.length) {
        const next = queue[index++];
        if (next instanceof ScyllaError) throw next;
        yield next;
        continue;
      }
      if (ended) return;
      await new Promise<void>(resolve => {
        wake = resolve;
      });
    }
  }

  const logAt = (line: string, nodeId: string, stream: string): JobLog => ({
    id: String(queue.length),
    jobId: JOB_ID,
    nodeId,
    stream,
    line,
    timestamp: '2026-01-01T00:00:00.000Z',
  });

  return {
    stream: { logs: generator(), cancel },
    push: (line: string, nodeId = '', stream = 'stdout') => {
      queue.push(logAt(line, nodeId, stream));
      wakeUp();
    },
    fail: (error: ScyllaError) => {
      queue.push(error);
      wakeUp();
    },
    end: () => {
      ended = true;
      wakeUp();
    },
    cancel,
  };
};

const settle = async (ms = 200) => {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, ms));
  flushSync();
};

/** The clean text of the lines of a node, or of the whole job. */
const textOf = (tail: TailedLogs, nodeId: string | null = null) =>
  tail
    .linesOf(nodeId)
    .map(line => line.text)
    .join('\n');

let tailLogs: ReturnType<typeof vi.fn<JobsRepository['tailLogs']>>;

const install = (repository: Partial<JobsRepository>) =>
  setDependencyRegistry({ jobs: { jobsRepository: repository as JobsRepository } });

/** Reads through a getter: `$effect.root` returns its teardown, not the callback's value. */
const start = (nodeId?: () => string | undefined) => {
  let tail: ReturnType<typeof createTailJobLogs> | undefined;

  const cleanup = $effect.root(() => {
    tail = createTailJobLogs({ jobId: () => JOB_ID, nodeId });
    flushSync();
  });

  return { tail: () => tail!, cleanup };
};

beforeEach(() => {
  tailLogs = vi.fn<JobsRepository['tailLogs']>();
});

afterEach(() => setDependencyRegistry(null));

describe('createTailJobLogs', () => {
  it('does not open a stream for an empty jobId', () => {
    install({ tailLogs });

    const cleanup = $effect.root(() => {
      createTailJobLogs({ jobId: () => '' });
      flushSync();
    });
    cleanup();

    expect(tailLogs).not.toHaveBeenCalled();
  });

  it('opens the stream scoped to the job, and to the node when given one', () => {
    const { stream } = createControllableStream();
    tailLogs.mockReturnValue(stream);
    install({ tailLogs });

    const cleanup = $effect.root(() => {
      createTailJobLogs({ jobId: () => JOB_ID, nodeId: () => 'build' });
      flushSync();
    });
    cleanup();

    expect(tailLogs).toHaveBeenCalledWith(JOB_ID, 'build');
  });

  it('reports the failure and stops loading when the stream cannot be opened', () => {
    const error = new ScyllaError('nope');
    tailLogs.mockImplementation(() => {
      throw error;
    });
    install({ tailLogs });

    const cleanup = $effect.root(() => {
      const tail = createTailJobLogs({ jobId: () => JOB_ID });
      flushSync();

      expect(tail.isError).toBe(true);
      expect(tail.error).toBe(error);
      expect(tail.isLoading).toBe(false);
    });
    cleanup();
  });

  it('buffers a burst of lines and publishes them together, not once per line', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const { tail, cleanup } = start();

    controller.push('first');
    controller.push('second');
    await settle();

    expect(textOf(tail())).toBe('first\nsecond');
    cleanup();
  });

  it('does a final flush when the stream ends, rather than losing the last lines between ticks', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const { tail, cleanup } = start();

    controller.push('only line');
    controller.end();
    // Shorter than the flush interval: the end of the stream publishes this.
    await settle(10);

    expect(textOf(tail())).toBe('only line');
    cleanup();
  });

  it('reports the failure when the stream breaks before any line, so the panel is not left empty', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const failure = new ScyllaError('not yours', { code: 'PERMISSION_DENIED' });
    vi.spyOn(failure, 'log').mockImplementation(() => failure);

    const { tail, cleanup } = start();

    controller.fail(failure);
    await settle();

    expect(tail().isError).toBe(true);
    expect(tail().error).toBe(failure);
    expect(tail().isLoading).toBe(false);
    cleanup();
  });

  it('keeps the lines read before the stream breaks, and logs the failure instead of writing it', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const failure = new ScyllaError('one bad line');
    const logged = vi.spyOn(failure, 'log').mockImplementation(() => failure);

    const { tail, cleanup } = start();

    controller.push('before');
    controller.fail(failure);
    await settle();

    expect(textOf(tail())).toBe('before');
    expect(tail().isError).toBe(false);
    expect(tail().error).toBe(failure);
    expect(logged).toHaveBeenCalled();
    cleanup();
  });

  it('files each line under its node, and keeps the whole job in order', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const { tail, cleanup } = start();

    controller.push('compile', 'build');
    controller.push('run the tests', 'test');
    controller.push('link', 'build');
    await settle();

    expect(textOf(tail())).toBe('compile\nrun the tests\nlink');
    expect(textOf(tail(), 'build')).toBe('compile\nlink');
    expect(textOf(tail(), 'test')).toBe('run the tests');
    expect(tail().linesOf('ghost')).toEqual([]);
    cleanup();
  });

  it('removes the escape codes, and keeps the color that a line of a node leaves open', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const { tail, cleanup } = start();

    controller.push('\x1b[32mgreen', 'build');
    controller.push('plain', 'test');
    controller.push('still green\x1b[0m', 'build');
    await settle();

    const [first, second] = tail().linesOf('build');
    expect(first.text).toBe('green');
    expect(second.spans).toEqual([{ from: 0, to: 11, fg: 'green' }]);
    // The color of `build` does not go into the lines of `test`.
    expect(tail().linesOf('test')[0].spans).toEqual([]);
    cleanup();
  });

  it('counts the error lines of each node and of the whole job', async () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const { tail, cleanup } = start();

    controller.push('error: cannot find crate', 'build');
    controller.push('all good', 'build');
    controller.push('\x1b[31mexit code 2\x1b[0m', 'test', 'stderr');
    controller.push('\x1b[31mred but on the output\x1b[0m', 'test');
    await settle();

    expect(tail().errorCount('build')).toBe(1);
    expect(tail().errorCount('test')).toBe(1);
    expect(tail().errorCount(null)).toBe(2);
    expect(tail().errorCount('deploy')).toBe(0);
    cleanup();
  });

  it('cancels the stream when the view goes away', () => {
    const controller = createControllableStream();
    tailLogs.mockReturnValue(controller.stream);
    install({ tailLogs });

    const cleanup = $effect.root(() => {
      createTailJobLogs({ jobId: () => JOB_ID });
      flushSync();
    });
    cleanup();

    expect(controller.cancel).toHaveBeenCalled();
  });

  it('opens a fresh stream, from a clean document, when the job changes', () => {
    const first = createControllableStream();
    const second = createControllableStream();
    tailLogs.mockReturnValueOnce(first.stream).mockReturnValueOnce(second.stream);
    install({ tailLogs });

    const cleanup = $effect.root(() => {
      let jobId = $state(JOB_ID);
      const tail = createTailJobLogs({ jobId: () => jobId });
      flushSync();

      jobId = 'job-2';
      flushSync();

      expect(first.cancel).toHaveBeenCalled();
      expect(tailLogs).toHaveBeenLastCalledWith('job-2', undefined);
      // Cleared: the previous job's output must not lead the new one's.
      expect(textOf(tail)).toBe('');
    });
    cleanup();
  });
});
