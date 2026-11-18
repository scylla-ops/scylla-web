<script lang="ts">
  import type { Snippet } from 'svelte';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import { ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import {
    countText,
    runTimeBars,
    shortPeriod,
  } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 'xs', editing }: Props = $props();

  const stats = $derived(widgets.stats.data);
  const minutes = $derived((stats?.totals.runTime ?? 0) / 60);
  const bars = $derived(runTimeBars(stats?.buckets ?? []));
</script>

<Widget {size} {editing} bare title={t(messages.runMinutes)} icon={ClockIcon as LucideIcon}>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={widgets.stats.isPending}
    error={widgets.stats.isError}
    onRetry={() => void widgets.stats.refetch()}
  >
    <div class="flex h-full min-w-0 items-center gap-4">
      <div class="shrink-0">
        <p class="text-xs">{t(messages.runMinutes)} · {shortPeriod(period.period)}</p>
        <p class="text-3xl font-medium tracking-tight tabular-nums">{countText(minutes)}</p>
      </div>
      <div class="flex h-12 min-w-0 flex-1 items-end justify-end gap-1" role="img" aria-label={t(messages.runMinutes)}>
        {#each bars as bar (bar.start)}
          <ChartSegment tone="passed" class="w-1.5 shrink-0 rounded-[2px]" style="height: {bar.height}%" />
        {/each}
      </div>
    </div>
  </WidgetBody>
</Widget>
