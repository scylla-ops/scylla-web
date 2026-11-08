<script lang="ts">
  import type { JobEntity } from '@base/features/jobs';
  import { StatusShape, StatusTrail, type StatusTrailItem } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { calculateDuration, formatDuration, getRelativeTime } from '@shared/utils/date-utils.ts';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    jobs: JobEntity[];
    maxJobs?: number;
    isLoading?: boolean;
    isError?: boolean;
    /** The history was not fetched: the user may not list this project's jobs. */
    isForbidden?: boolean;
    onSelectJob?: (jobId: string) => void;
  }

  let { jobs, maxJobs, isLoading = false, isError = false, isForbidden = false, onSelectJob }: Props =
    $props();

  type RunItem = StatusTrailItem & { job: JobEntity; runNumber: number };

  const items = $derived.by((): RunItem[] =>
    jobs
      .slice(0, maxJobs)
      .map((job, index) => ({
        id: job.id,
        state: toStatusState(job.status),
        // Oldest on the left: run numbers count up.
        runNumber: jobs.length - index,
        job,
        label: t(pipelineMessages.runNumber(jobs.length - index)),
        onSelect: onSelectJob ? () => onSelectJob(job.id) : undefined,
      }))
      .reverse(),
  );
</script>

{#snippet runTooltip(item: RunItem)}
  {@const config = getStatusConfig(item.job.status)}
  {@const duration = calculateDuration(item.job.createdAt, item.job.updatedAt)}
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-4">
      <span class="font-bold text-muted-foreground">{t(pipelineMessages.runNumber(item.runNumber))}</span>
      <span class="font-mono text-[10px] text-muted-foreground">{item.job.id.slice(0, 8)}...</span>
    </div>
    <div class="flex items-center gap-2">
      <StatusShape state={toStatusState(item.job.status)} label={t(config.label)} size={16} />
      <span class={cn('font-semibold', config.textClassName)}>{t(config.label)}</span>
    </div>
    <span class="mt-1 border-t pt-1 text-[10px] text-muted-foreground italic">
      {item.job.status === 'running' || item.job.status === 'pending'
        ? t(pipelineMessages.startedAt(getRelativeTime(item.job.createdAt)))
        : t(pipelineMessages.finishedAt(getRelativeTime(item.job.updatedAt)))}
      • {t(pipelineMessages.durationOf(formatDuration(duration)))}
    </span>
  </div>
{/snippet}

{#if isLoading}
  <div class="flex h-10 w-full items-center gap-5 px-1">
    {#each { length: maxJobs ?? 0 } as _, index (index)}
      <Skeleton class="size-2.5 shrink-0 rounded-full" />
    {/each}
  </div>
{:else if isForbidden}
  <!-- Before the error state: nothing was asked, so nothing failed. -->
  <div class="flex h-10 w-full items-center justify-center py-1">
    <span class="text-xs text-muted-foreground italic">{t(pipelineMessages.jobsForbidden)}</span>
  </div>
{:else if isError}
  <div class="flex h-10 w-full items-center justify-center py-1">
    <span class="text-xs text-muted-foreground italic">{t(pipelineMessages.jobsError)}</span>
  </div>
{:else}
  <div class="flex h-10 w-full items-center px-1">
    <StatusTrail {items} tooltip={runTooltip} emptyLabel={t(pipelineMessages.noJobsYet)} />
  </div>
{/if}
