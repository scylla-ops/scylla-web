<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import type { JobEntity } from '@base/features/jobs';
  import { StatusShape } from '@scylla/ui';
  import { Skeleton, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { createNow } from '@scylla/ui/state';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatDuration, getRelativeTime } from '@shared/utils/date-utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import {
    historyBars,
    shortId,
    type HistoryBar,
  } from '@base/features/pipeline/presentation/presenters/pipeline-history.presenter.ts';

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

{#snippet jobTooltip(bar: HistoryBar)}
  {@const config = getStatusConfig(bar.job.status)}
  {@const ref = bar.job.source?.branch || bar.job.source?.tag}
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-4">
      <span class="font-mono font-medium text-foreground">{shortId(bar.job.id)}</span>
      {#if ref}
        <span class="max-w-30 truncate font-mono text-[10px] text-muted-foreground">{ref}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <StatusShape state={bar.state} label={t(config.label)} size={16} />
      <span class={cn('font-semibold', config.textClassName)}>{t(config.label)}</span>
    </div>
    {#if bar.job.source?.title}
      <span class="truncate text-muted-foreground">{bar.job.source.title}</span>
    {/if}
    <span class="mt-1 border-t pt-1 text-[10px] text-muted-foreground italic">
      {bar.job.finishedAt
        ? t(pipelineMessages.finishedAt(getRelativeTime(bar.job.finishedAt)))
        : t(pipelineMessages.startedAt(getRelativeTime(bar.job.startedAt ?? bar.job.createdAt)))}
      {#if bar.duration !== null}
        • {t(pipelineMessages.durationOf(formatDuration(bar.duration)))}
      {/if}
    </span>
  </div>
{/snippet}

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
        {@const status = t(getStatusConfig(bar.job.status).label)}
        <Tooltip delayDuration={100}>
          <TooltipTrigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                aria-label={t(pipelineMessages.jobBar(shortId(bar.job.id), status))}
                data-item-id={bar.job.id}
                data-state={bar.state}
                style:height="{bar.height}px"
                onclick={event => {
                  // The trigger's handler closes the tooltip; the row must not take the click.
                  (props.onclick as ((event: MouseEvent) => void) | undefined)?.(event);
                  event.stopPropagation();
                  onSelectJob(bar.job.id);
                }}
                class={cn(
                  'w-5 shrink-0 origin-bottom cursor-pointer rounded-sm transition-[height,scale] duration-150 outline-none hover:scale-y-110 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  bar.className,
                )}
              ></button>
            {/snippet}
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={4}
            arrow={false}
            class="w-62 border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          >
            {@render jobTooltip(bar)}
          </TooltipContent>
        </Tooltip>
      {/each}
    {/if}
  </div>
</div>
