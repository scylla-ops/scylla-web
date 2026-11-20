import { t } from '@scylla/ui/i18n';
import type { AppEntity, AppHost, AppJob } from '@base/features/apps';
import type { PipelineSummary } from '@base/features/pipeline';
import type { AgentMetricsBucket } from '@base/features/dashboard/domain/structs/agent-metrics.struct.ts';
import { agentWidgetMessages as messages } from '@base/features/dashboard/presentation/messages/agent-widget.messages.ts';
import { shortJobId } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
import { runMark, type RunMark } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';

export type SlotState = 'busy' | 'free' | 'offline';

export interface LoadBar {
  start: string;
  cpu: number | null;
  ram: number | null;
}

const BYTES_IN_MB = 1024 * 1024;
const MIN_LOAD_FILL = 2;

/** `null` is an hour with no sample. A load above 0 fills at least 2 % so it does not read as 0 %. */
export const loadFill = (value: number | null): number | null =>
  value === null ? null : value <= 0 ? 0 : Math.min(100, Math.max(MIN_LOAD_FILL, value));

const percentOf = (bytes: number, totalMb: number | null | undefined): number | null =>
  totalMb ? Math.min(100, Math.round((bytes / (totalMb * BYTES_IN_MB)) * 100)) : null;

export const agentSlots = (agent: AppEntity): SlotState[] => {
  const slots = Math.max(1, agent.host?.capacity ?? 1);
  if (!agent.connected) return ['offline'];
  const busy = Math.min(slots, agent.runningJobs);
  return Array.from({ length: slots }, (_, index) => (index < busy ? 'busy' : 'free'));
};

export const agentLoad = (agent: AppEntity): { cpu: number | null; ram: number | null } => {
  if (!agent.connected || !agent.lastSample) return { cpu: null, ram: null };
  return {
    cpu: Math.round(agent.lastSample.cpuPercent),
    ram: percentOf(agent.lastSample.memoryUsedBytes, agent.host?.totalMemoryMb),
  };
};

export const loadBars = (
  buckets: readonly AgentMetricsBucket[],
  totalMemoryMb: number | null | undefined,
): LoadBar[] =>
  buckets.map(bucket => ({
    start: bucket.start,
    cpu: bucket.samples > 0 ? Math.min(100, Math.round(bucket.cpuPercent)) : null,
    ram: bucket.samples > 0 ? percentOf(bucket.memoryBytes, totalMemoryMb) : null,
  }));

export const hostFacts = (host: AppHost | null): string[] =>
  host
    ? [
        host.os,
        host.arch,
        host.cpuCount ? t(messages.cpuCount(host.cpuCount)) : '',
        host.containerRuntime,
      ].filter(Boolean)
    : [];

export const recentRuns = (
  jobs: readonly AppJob[],
  count: number,
  pipelines: ReadonlyMap<string, PipelineSummary>,
): RunMark[] =>
  jobs
    .filter(job => job.finishedAt)
    .slice(0, count)
    .reverse()
    .map(job => {
      const pipeline = pipelines.get(job.pipelineId);
      return runMark(job, {
        id: job.pipelineId,
        name: pipeline?.name ?? shortJobId(job.pipelineId),
        projectId: job.projectId,
        projectName: pipeline?.projectName ?? '',
      });
    });
