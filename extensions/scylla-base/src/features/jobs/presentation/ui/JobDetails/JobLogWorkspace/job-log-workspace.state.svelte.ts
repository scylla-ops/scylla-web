import { createNow } from '@scylla/ui/state';
import { t } from '@scylla/ui/i18n';
import { calculateExecutionDuration } from '@shared/utils/date-utils.ts';
import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
import { jobGitMessages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
import {
  jobNodeRows,
  type TimelineBar,
} from '@base/features/jobs/presentation/presenters/job-node-rows.presenter.ts';
import { attemptOf } from '@base/features/jobs/presentation/presenters/node-attempt.presenter.ts';
import { jobPath } from '@base/features/jobs/presentation/presenters/job-path.presenter.ts';
import { createTailJobLogs } from '@base/features/jobs/presentation/ui/jobs-log/tail-job-logs.state.svelte.ts';

/** An entry of the list of the nodes: a step of the job, or the whole job (`id: null`). */
export interface NodeItem {
  id: string | null;
  name: string;
  state: string;
  extras: string[];
  /** In seconds. */
  duration: number | null;
  bar: TimelineBar | null;
}

/**
 * The log part of the job page: one stream for the whole job, which the list (the errors of each
 * node) and the viewer (the lines of the chosen node) read, and the entries of the list.
 */
export const createJobLogWorkspace = (job: () => JobEntity, nodeId: () => string | null) => {
  const tail = createTailJobLogs({ jobId: () => job().id });

  // The bars and the durations of a running job move with the clock.
  const now = createNow(() => isActiveStatus(job().status));
  const rows = $derived.by(() => {
    void now.value;
    return jobNodeRows(job(), Date.now());
  });

  const nameOf = (id: string, builtIn: boolean) => (builtIn ? t(jobGitMessages.checkout) : id);

  const items = $derived.by((): NodeItem[] => {
    const current = job();
    void now.value;
    return [
      {
        id: null,
        name: t(jobsMessages.wholeJob),
        state: current.status,
        extras: [],
        duration: calculateExecutionDuration(current.startedAt, current.finishedAt),
        bar: null,
      },
      ...rows.map(row => {
        const attempt = attemptOf(row.execution);
        return {
          id: row.id,
          name: nameOf(row.id, row.builtIn),
          state: row.execution.state,
          extras: [
            row.builtIn ? t(jobGitMessages.builtIn) : '',
            attempt ? t(jobsMessages.attempt(attempt.attempt, attempt.maxAttempts)) : '',
            row.execution.ports.join(', '),
          ].filter(Boolean),
          duration: row.duration,
          bar: row.bar,
        };
      }),
    ];
  });

  const selected = $derived(rows.find(row => row.id === nodeId()) ?? null);
  const path = $derived(jobPath(job().nodes, job().nodeExecutions));

  return {
    tail,
    get items() {
      return items;
    },
    /** The step of the log, or `null` for the whole job. */
    get selected() {
      return selected;
    },
    get title() {
      return selected ? nameOf(selected.id, selected.builtIn) : t(jobsMessages.wholeJob);
    },
    get path() {
      return path;
    },
    /** A skipped node has no log: why it did not run. */
    get unavailable() {
      if (selected?.execution.state !== 'skipped') return undefined;
      return t(
        path.skipped.get(selected.id) === 'not-taken'
          ? jobsMessages.nodeNotTaken
          : jobsMessages.nodeSkipped,
      );
    },
    /** The name of a download: the job, and the node with no dot at its start. */
    get fileName() {
      const node = selected?.id.replace(/^\.+/, '').replace(/[^\w.-]+/g, '_');
      return `job-${job().id}${node ? `-${node}` : ''}`;
    },
  };
};
