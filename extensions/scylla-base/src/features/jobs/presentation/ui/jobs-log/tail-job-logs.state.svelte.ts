import { getModuleDomain } from '@scylla/core-sdk';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { JobLog, JobLogStream } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobsModule } from '@base/features/jobs/jobs.module.ts';
import type { AnsiState } from '@base/features/jobs/presentation/presenters/ansi.presenter.ts';
import {
  readLogLine,
  type LogLine,
} from '@base/features/jobs/presentation/presenters/log-lines.presenter.ts';

/** Lines are buffered and flushed on a timer: publishing per line is O(n²) and makes the stream lag and drop lines. */
const FLUSH_INTERVAL_MS = 150;
/** The lines read at most at each flush: a long finished log arrives whole and must not block the page. */
const LINES_PER_FLUSH = 5000;

const NO_LINES: readonly LogLine[] = [];

export interface TailedLogs {
  /** Grows at each publish. Read it to follow `linesOf` and `errorCount`. */
  readonly version: number;
  /** The lines of one node, or of the whole job (`null`), in order. The array grows in place. */
  linesOf: (nodeId: string | null) => readonly LogLine[];
  /** The error lines of one node, or of the whole job (`null`). */
  errorCount: (nodeId: string | null) => number;
  readonly isLoading: boolean;
  /** A failure before any line: the viewer shows it instead of an empty log. */
  readonly isError: boolean;
  readonly isEnded: boolean;
  /** The failure of the stream. After some lines, they stay and the viewer says it stopped. */
  readonly error: ScyllaError | null;
}

export interface TailJobLogsOptions {
  jobId: () => string;
  nodeId?: () => string | undefined;
}

/**
 * A job's logs as one ordered stream: the full history, then the live lines. Each line is read
 * once (its escape codes, whether it is an error) and filed under its node. `jobId` and `nodeId`
 * are getters: the page is reused across jobs.
 */
export const createTailJobLogs = ({ jobId, nodeId }: TailJobLogsOptions): TailedLogs => {
  let version = $state(0);
  // Written, never read, by the effect: reading `version` there would run it again.
  let revision = 0;
  let isLoading = $state(true);
  let isError = $state(false);
  let isEnded = $state(false);
  let error = $state<ScyllaError | null>(null);

  // Not state: they grow in place, and `version` tells when.
  let all: LogLine[] = [];
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- grows in place, `version` tells when
  let byNode = new Map<string, LogLine[]>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- grows in place, `version` tells when
  let errors = new Map<string | null, number>();

  $effect(() => {
    const currentJobId = jobId();
    const currentNodeId = nodeId?.();
    if (!currentJobId) return;

    let active = true;
    const pending: JobLog[] = [];
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the parser state of each node, never state
    const styles = new Map<string, AnsiState>();

    all = [];
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- grows in place, `version` tells when
    byNode = new Map();
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- grows in place, `version` tells when
    errors = new Map();
    version = ++revision;
    isLoading = true;
    isError = false;
    isEnded = false;
    error = null;

    let stream: JobLogStream;
    try {
      stream = getModuleDomain<typeof JobsModule.domain>('jobs').jobsRepository.tailLogs(
        currentJobId,
        currentNodeId,
      );
    } catch (failure) {
      isError = true;
      error = ScyllaError.from(failure);
      isLoading = false;
      return;
    }

    const flush = () => {
      if (!active || pending.length === 0) return;
      for (const log of pending.splice(0, LINES_PER_FLUSH)) {
        const { line, state } = readLogLine(log, styles.get(log.nodeId));
        styles.set(log.nodeId, state);
        all.push(line);
        const nodeLines = byNode.get(line.nodeId);
        if (nodeLines) nodeLines.push(line);
        else byNode.set(line.nodeId, [line]);
        if (line.isError) {
          errors.set(null, (errors.get(null) ?? 0) + 1);
          errors.set(line.nodeId, (errors.get(line.nodeId) ?? 0) + 1);
        }
      }
      version = ++revision;
    };
    const flushTimer = window.setInterval(flush, FLUSH_INTERVAL_MS);

    const consume = async () => {
      isLoading = false;
      let read = 0;
      try {
        for await (const log of stream.logs) {
          if (!active) break;
          pending.push(log);
          read += 1;
        }
        if (active) isEnded = true;
      } catch (failure) {
        // After the cleanup, the failure is the cancel itself.
        if (!active) return;
        const thrown = ScyllaError.from(failure);
        thrown.log();
        error = thrown;
        isError = read === 0;
      }
      flush(); // final flush, so the last lines aren't lost between ticks
    };

    void consume();

    return () => {
      active = false;
      window.clearInterval(flushTimer);
      stream.cancel();
    };
  });

  return {
    get version() {
      return version;
    },
    linesOf: (id: string | null) => {
      void version;
      return id === null ? all : (byNode.get(id) ?? NO_LINES);
    },
    errorCount: (id: string | null) => {
      void version;
      return errors.get(id) ?? 0;
    },
    get isLoading() {
      return isLoading;
    },
    get isError() {
      return isError;
    },
    /** The stream ended by itself: no more line comes. */
    get isEnded() {
      return isEnded;
    },
    get error() {
      return error;
    },
  };
};
