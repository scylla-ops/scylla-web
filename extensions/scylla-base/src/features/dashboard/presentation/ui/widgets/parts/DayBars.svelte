<script lang="ts">
  import { ChartLegendItem, ChartSegment } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { JobBucket } from '@base/features/jobs';
  import type { PeriodBucket } from '@base/features/dashboard/presentation/presenters/period.presenter.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { bucketAxis, bucketLabel } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
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

  const highest = $derived(
    Math.max(1, ...buckets.map(({ figures: { outcomes: o } }) => o.completed + o.failed + o.orphaned + o.cancelled)),
  );
  const scale = (value: number) => (value / highest) * 100;
  const axis = $derived(bucketAxis(buckets, bucket, timeZone, endsNow));
</script>

<div class="flex min-h-0 flex-col gap-1 {className}">
  <div class="flex min-h-0 flex-1 items-end gap-1.5">
    {#each buckets as item (item.start)}
      {@const o = item.figures.outcomes}
      <BarTip class="flex h-full min-w-0 flex-1 flex-col-reverse gap-px" top={scale(o.completed + o.failed + o.orphaned + o.cancelled)}>
        {#if o.completed > 0}<ChartSegment tone="passed" class="rounded-[2px]" style="height: {scale(o.completed)}%" />{/if}
        {#if o.failed > 0}<ChartSegment tone="failed" class="rounded-[2px]" style="height: {scale(o.failed)}%" />{/if}
        {#if o.orphaned + o.cancelled > 0}<ChartSegment tone="canceled" class="rounded-[2px]" style="height: {scale(o.orphaned + o.cancelled)}%" />{/if}
        {#snippet tip()}
          <span class="font-medium">{bucketLabel(item.start, bucket, timeZone)}</span>
          <ChartLegendItem tone="passed" label={t(widgetMessages.completed)} value={o.completed} />
          <ChartLegendItem tone="failed" label={t(widgetMessages.failed)} value={o.failed} />
          <ChartLegendItem tone="canceled" label={t(widgetMessages.orphaned)} value={o.orphaned} />
          <ChartLegendItem tone="canceled" label={t(widgetMessages.cancelledLegend)} value={o.cancelled} />
        {/snippet}
      </BarTip>
    {/each}
  </div>
  {#if axis}<BucketAxis labels={axis} />{/if}
</div>
