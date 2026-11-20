<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { JobEntity } from '@base/features/jobs';
  import { Skeleton } from '@scylla/ui/primitives';
  import { createNow } from '@scylla/ui/state';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { JobRunMark } from '@shared/presentation/ui';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import { historyBars } from '@base/features/pipeline/presentation/presenters/pipeline-history.presenter.ts';

  interface Props {
    /** Newest first. */
    jobs: JobEntity[];
    /** The bars that the column holds. */
    count: number;
    /** On the box of the bars: it gives `count`. */
    measure: Attachment<HTMLElement>;
    isLoading?: boolean;
    isError?: boolean;
    /** The history was not fetched: the user may not list this project's jobs. */
    isForbidden?: boolean;
    onSelectJob: (jobId: string) => void;
  }

  let {
    jobs,
    count,
    measure,
    isLoading = false,
    isError = false,
    isForbidden = false,
    onSelectJob,
  }: Props = $props();

  // A running job has no end: its bar grows each second, and stops when it finishes.
  const isLive = $derived(jobs.slice(0, count).some(job => job.status === 'running'));
  const now = createNow(() => isLive);
  const bars = $derived(historyBars(jobs, count, now.value));

  /** Shown in place of the bars, centered in the same block. */
  const notice = $derived(
    isForbidden
      ? t(pipelineMessages.jobsForbidden)
      : isError
        ? t(pipelineMessages.jobsError)
        : !isLoading && bars.length === 0
          ? t(pipelineMessages.noRunYet)
          : null,
  );
</script>

<div class="w-full rounded-md border px-2 py-1.5">
  <div
    {@attach measure}
    class={cn(
      'flex h-12 gap-1',
      notice ? 'items-center justify-center' : 'items-end justify-start',
    )}
  >
    {#if notice}
      <span class="text-xs text-muted-foreground [text-box:trim-both_cap_alphabetic]">{notice}</span>
    {:else if isLoading}
      {#each { length: count } as _, index (index)}
        <Skeleton class="h-10 w-5 shrink-0 rounded-sm" />
      {/each}
    {:else}
      {#each bars as bar (bar.job.id)}
        <JobRunMark
          run={{ ...bar.job, ref: bar.job.source?.branch || bar.job.source?.tag, title: bar.job.source?.title }}
          duration={bar.duration}
          data-state={bar.state}
          style="height: {bar.height}px"
          class={cn('w-5 origin-bottom rounded-sm transition-[height,scale]', bar.className)}
          onSelect={() => onSelectJob(bar.job.id)}
        />
      {/each}
    {/if}
  </div>
</div>
