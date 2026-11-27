import type { MessageDescriptor } from '@lingui/core';
import type { StatusState } from '@scylla/ui';
import type { JobStatus } from '@shared/domain/structs/job-status.struct.ts';
import { toStatusState } from '@shared/utils/job-status.utils.ts';
import { projectCardMessages } from '../messages/project-card.messages.ts';
import type {
  PipelineSummary,
  RecentRun,
} from '@base/features/pipeline/domain/structs/pipeline-summary.struct.ts';

/** The pipelines that a project card shows. The others are one link to the project. */
export const CARD_PIPELINES = 3;

/**
 * The time of a row: since when its job runs or waits (`live`), the next fire of its cron, or its
 * last job.
 */
export type RowTime =
  { kind: 'live'; since: string } | { kind: 'next'; at: string } | { kind: 'last'; at: string };

/** The job that the footer tells about: the state of the server, and since when it is so. */
export interface LiveFooter {
  kind: 'live';
  status: JobStatus;
  since: string;
}

/** One pipeline on a project card. */
export interface CardPipelineRow {
  id: string;
  name: string;
  /**
   * The state of its jobs that run or wait (`running`, else `pending`, else `awaiting_approval`),
   * else the status of its last job. `null`: no job.
   */
  status: JobStatus | null;
  /** The form of the status, for `StatusShape`. */
  state: StatusState;
  /** The branch of its last job. Empty: a tag, no source, or no job. */
  branch: string;
  time: RowTime | null;
}

/** The pipelines of one project, as its card shows them. */
export interface CardPipelines {
  /** The first pipelines, in the order of the summaries: the failing ones first. */
  rows: CardPipelineRow[];
  /** The pipelines that the card does not show. */
  more: number;
  /** The pipelines whose last ended job of the default branch did not complete. */
  failing: number;
  /** The line at the bottom of the card. `null`: the project has no pipeline. */
  footer: LiveFooter | Exclude<RowTime, { kind: 'live' }> | { kind: 'none' } | null;
}

/** The live states, in the order of the footer: a job that runs first. */
const LIVE_ORDER: readonly JobStatus[] = ['running', 'pending', 'awaiting_approval'];

/** The footer text of each live state: "Job running for 2 min", "Job pending for 2 min". */
const LIVE_FOOTERS: Partial<Record<JobStatus, (duration: string) => MessageDescriptor>> = {
  running: projectCardMessages.jobRunningFor,
  pending: projectCardMessages.jobPendingFor,
  awaiting_approval: projectCardMessages.jobAwaitingApprovalFor,
};

/** The footer text of a live state. */
export const liveFooterMessage = (status: JobStatus): ((duration: string) => MessageDescriptor) =>
  LIVE_FOOTERS[status] ?? projectCardMessages.jobPendingFor;

/** When a job started, or was created if it waits. */
const startOf = (run: RecentRun): string => run.startedAt ?? run.createdAt;

/** The newest recent job in the live state of the pipeline, if the recent jobs hold one. */
const liveRunOf = (summary: PipelineSummary): RecentRun | undefined =>
  summary.live ? summary.recent.find(run => run.status === summary.live) : undefined;

const timeOf = (summary: PipelineSummary): RowTime | null => {
  const live = liveRunOf(summary);
  if (live) return { kind: 'live', since: startOf(live) };
  if (summary.nextFire) return { kind: 'next', at: summary.nextFire.at };
  const last = summary.recent[0];
  return last ? { kind: 'last', at: last.createdAt } : null;
};

const statusOf = (summary: PipelineSummary): JobStatus | null =>
  summary.live ?? summary.recent[0]?.status ?? null;

const rowOf = (summary: PipelineSummary): CardPipelineRow => ({
  id: summary.id,
  name: summary.name,
  status: statusOf(summary),
  state: toStatusState(statusOf(summary) ?? undefined),
  branch: summary.recent[0]?.branch ?? '',
  time: timeOf(summary),
});

/** The oldest of the times, as ISO texts. */
const oldest = (times: string[]): string | undefined =>
  times.reduce<string | undefined>(
    (found, time) => (found === undefined || Date.parse(time) < Date.parse(found) ? time : found),
    undefined,
  );

/** The newest of the times, as ISO texts. */
const newest = (times: string[]): string | undefined =>
  times.reduce<string | undefined>(
    (found, time) => (found === undefined || Date.parse(time) > Date.parse(found) ? time : found),
    undefined,
  );

/**
 * The footer: the job that runs for the longest time, else the job that waits for the longest
 * time, else the newest job, else the next fire of a cron.
 */
const footerOf = (pipelines: PipelineSummary[]): CardPipelines['footer'] => {
  if (pipelines.length === 0) return null;
  for (const status of LIVE_ORDER) {
    const since = oldest(
      pipelines.flatMap(summary => {
        const live = summary.live === status ? liveRunOf(summary) : undefined;
        return live ? [startOf(live)] : [];
      }),
    );
    if (since) return { kind: 'live', status, since };
  }
  const last = newest(pipelines.flatMap(summary => summary.recent[0]?.createdAt ?? []));
  if (last) return { kind: 'last', at: last };
  const next = oldest(pipelines.flatMap(summary => summary.nextFire?.at ?? []));
  return next ? { kind: 'next', at: next } : { kind: 'none' };
};

/** The pipelines of one project, from the summaries of its batch of cards. */
export const cardPipelinesOf = (
  summaries: readonly PipelineSummary[],
  projectId: string,
): CardPipelines => {
  const pipelines = summaries.filter(summary => summary.projectId === projectId);
  return {
    rows: pipelines.slice(0, CARD_PIPELINES).map(rowOf),
    more: Math.max(0, pipelines.length - CARD_PIPELINES),
    failing: pipelines.filter(summary => summary.health === 'red').length,
    footer: footerOf(pipelines),
  };
};
