/** The number of jobs for each end. */
export interface JobOutcomes {
  completed: number;
  failed: number;
  /** A user cancelled the job. */
  cancelled: number;
  /** The agent of the job went away or was disabled. */
  orphaned: number;
}

/** The figures of a set of jobs. A duration is in seconds; `null` when no job gives one. */
export interface JobFigures {
  /** Each job of the set, also the jobs that did not end. */
  created: number;
  outcomes: JobOutcomes;
  /** From the start to the end of the jobs that started and ended. */
  p50Duration: number | null;
  p95Duration: number | null;
  /** The wait for an agent of the jobs that started. */
  p50Queue: number | null;
  p95Queue: number | null;
  /** The sum of the durations: the run time. */
  runTime: number;
}

/** The jobs created in one hour, day or week of the period. */
export interface JobBucket {
  /** The start of the bucket in the time zone of the workspace, as an ISO instant. */
  start: string;
  figures: JobFigures;
}

/** The jobs of one project, pipeline or agent. */
export interface JobGroup {
  id: string;
  figures: JobFigures;
  /** Set when the stats compare with the previous period. */
  previous: JobFigures | null;
}

/** The figures that the server computes for the jobs of a period. */
export interface JobStats {
  totals: JobFigures;
  /** Oldest first, also the buckets with no job. */
  buckets: JobBucket[];
  groups: JobGroup[];
  /** The period of the same length that ends at the start of this one. */
  previous: JobFigures | null;
  /** The IANA zone of the workspace: the buckets start at its hours, days and weeks. */
  timeZone: string;
}

export type JobStatsBucketSize = 'hour' | 'day' | 'week';

export type JobStatsGroupBy = 'project' | 'pipeline' | 'agent';

/** The largest value first. */
export type JobStatsOrder = 'count' | 'failed' | 'p50-duration' | 'run-time';

/** What to count. `to: null` is now. */
export interface JobStatsQuery {
  workspaceId: string;
  from: Date;
  to: Date | null;
  bucket?: JobStatsBucketSize;
  projectIds?: string[];
  pipelineIds?: string[];
  groupBy?: JobStatsGroupBy;
  groupOrder?: JobStatsOrder;
  /** At most 100. */
  groupLimit?: number;
  /** Also count the previous period of the same length. */
  compare?: boolean;
}

/** The jobs that the success rate counts: a cancelled job does not count. */
export const decidedJobs = (outcomes: JobOutcomes): number =>
  outcomes.completed + outcomes.failed + outcomes.orphaned;

/**
 * completed / (completed + failed + orphaned), from 0 to 1. `null` when no job counts: this is
 * not 0 %.
 */
export const successRate = (outcomes: JobOutcomes): number | null => {
  const decided = decidedJobs(outcomes);
  return decided === 0 ? null : outcomes.completed / decided;
};

/** The change of the success rate in points of percent. `null` when a period has no rate. */
export const successRateChange = (current: JobOutcomes, previous: JobOutcomes): number | null => {
  const now = successRate(current);
  const before = successRate(previous);
  return now === null || before === null ? null : (now - before) * 100;
};
