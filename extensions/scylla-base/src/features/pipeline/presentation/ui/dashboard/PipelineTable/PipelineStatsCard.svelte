<script lang="ts">
  import type { PipelineHistory } from '@base/features/jobs';
  import { CopyableText } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatDay, getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { PipelineMetadata } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';
  import {
    historyFigures,
    historyStats,
    shortId,
  } from '@base/features/pipeline/presentation/presenters/pipeline-history.presenter.ts';

  interface Props {
    pipeline: PipelineMetadata;
    /** Not loaded yet, or not allowed: the card has no figures. */
    history?: PipelineHistory;
    /** The jobs of the bars of the row. */
    count: number;
  }

  let { pipeline, history, count }: Props = $props();

  const stats = $derived(history ? historyStats(history.jobs, count, Date.now()) : null);

  const figures = $derived(stats ? historyFigures(stats) : []);
</script>

<div class="flex flex-col gap-2.5 text-xs">
  {#if history && stats}
    <div class="flex items-center justify-between gap-4 whitespace-nowrap">
      <span class="font-semibold text-foreground">{t(pipelineMessages.historyOfLast(stats.count))}</span>
      <span class="text-muted-foreground">{t(pipelineMessages.runsInTotal(history.totalCount))}</span>
    </div>
    <div class="grid grid-cols-3 gap-2">
      {#each figures as figure (figure.label)}
        <div class="flex min-w-0 flex-col items-center">
          <span class="font-display text-base font-medium text-foreground">{figure.value}</span>
          <span class="text-muted-foreground">{figure.label}</span>
        </div>
      {/each}
    </div>
  {/if}
  <div class={cn('flex flex-col gap-1', stats && 'border-t pt-2')}>
    <CopyableText value={pipeline.id} copyButtonClass="size-6" class="text-muted-foreground" />
    {#if stats?.lastFailure}
      <div class="flex items-center justify-between gap-4">
        <span class="text-muted-foreground">{t(pipelineMessages.lastFailure)}</span>
        <span class="flex items-center gap-1.5">
          <span class="font-mono text-foreground">{shortId(stats.lastFailure.id)}</span>
          <span class="text-muted-foreground">
            {getRelativeTime(stats.lastFailure.finishedAt ?? stats.lastFailure.updatedAt)}
          </span>
        </span>
      </div>
    {/if}
    <div class="flex items-center justify-between gap-4">
      <span class="text-muted-foreground">{t(pipelineMessages.created)}</span>
      <span class="text-foreground">{formatDay(pipeline.createdAt)}</span>
    </div>
  </div>
</div>
