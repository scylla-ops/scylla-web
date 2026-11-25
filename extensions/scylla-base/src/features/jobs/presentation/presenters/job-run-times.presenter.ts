import { formatDate, formatTime } from '@shared/utils/date-utils.ts';
import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';

/** A time of the run, in the details of a job. */
export interface RunTime {
  kind: 'created' | 'started' | 'finished';
  /** The date and the hour, for the tooltip. */
  full: string;
  /** Only the hour on the day of the creation of the job, else the date and the hour. */
  text: string;
}

/** The times that the run has, in their order: created, started, finished. */
export const runTimes = (
  job: Pick<JobEntity, 'createdAt' | 'startedAt' | 'finishedAt'>,
): RunTime[] => {
  const day = new Date(job.createdAt).toDateString();
  const times = [
    { kind: 'created', at: job.createdAt },
    { kind: 'started', at: job.startedAt },
    { kind: 'finished', at: job.finishedAt },
  ] as const;

  return times.flatMap(({ kind, at }) => {
    const full = formatDate(at);
    if (full === '-') return [];
    const sameDay = kind !== 'created' && new Date(at ?? '').toDateString() === day;
    return [{ kind, full, text: sameDay ? formatTime(at) : full }];
  });
};
