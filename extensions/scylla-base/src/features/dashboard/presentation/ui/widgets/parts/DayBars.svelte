<script lang="ts">
  import { ChartLegendItem, ChartSegment } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JobBucket } from '@base/features/jobs';
  import type { PeriodBucket } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { bucketAxis, bucketLabel, dayBars } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import BarTip from './BarTip.svelte';
  import BucketAxis from './BucketAxis.svelte';

  interface Props {
    buckets: readonly JobBucket[];
    bucket: PeriodBucket;
    timeZone: string;
    endsNow: boolean;
    class?: string;
  }

  let { buckets, bucket, timeZone, endsNow, class: className = '' }: Props = $props();

  const bars = $derived(dayBars(buckets));
  const axis = $derived(bucketAxis(buckets, bucket, timeZone, endsNow));
</script>

<div class="flex min-h-0 flex-col gap-1 {className}">
  <div class="flex min-h-0 flex-1 items-end gap-1.5">
    {#each buckets as item, index (item.start)}
      {@const o = item.figures.outcomes}
      {@const bar = bars[index]}
      <BarTip
        class={cn(
          'flex h-full min-w-0 flex-1 flex-col-reverse gap-px overflow-hidden rounded-[2px]',
          bar.empty ? 'border border-dashed border-border' : 'bg-muted/70',
        )}
        top={bar.top}
      >
        {#if o.completed > 0}<ChartSegment tone="passed" class="rounded-[2px]" style="height: {bar.completed}%" />{/if}
        {#if o.failed > 0}<ChartSegment tone="failed" class="rounded-[2px]" style="height: {bar.failed}%" />{/if}
        {#if o.orphaned + o.cancelled > 0}<ChartSegment tone="canceled" class="rounded-[2px]" style="height: {bar.other}%" />{/if}
        {#snippet tip()}
          <span class="font-medium">{bucketLabel(item.start, bucket, timeZone)}</span>
          {#if bar.empty}
            <span class="text-muted-foreground">{t(widgetMessages.noRunInBucket)}</span>
          {:else}
            <ChartLegendItem tone="passed" label={t(widgetMessages.completed)} value={o.completed} />
            <ChartLegendItem tone="failed" label={t(widgetMessages.failed)} value={o.failed} />
            <ChartLegendItem tone="canceled" label={t(widgetMessages.orphaned)} value={o.orphaned} />
            <ChartLegendItem tone="canceled" label={t(widgetMessages.cancelledLegend)} value={o.cancelled} />
          {/if}
        {/snippet}
      </BarTip>
    {/each}
  </div>
  {#if axis}<BucketAxis labels={axis} />{/if}
</div>
