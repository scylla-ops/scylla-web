<script lang="ts">
  import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import { shownSize } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import ActivityWidget from '../widgets/ActivityWidget/ActivityWidget.svelte';
  import AgentsWidget from '../widgets/AgentsWidget/AgentsWidget.svelte';
  import NeedsYouWidget from '../widgets/NeedsYouWidget/NeedsYouWidget.svelte';
  import PipelinesWidget from '../widgets/PipelinesWidget/PipelinesWidget.svelte';
  import QuickActionsWidget from '../widgets/QuickActionsWidget/QuickActionsWidget.svelte';
  import RightNowWidget from '../widgets/RightNowWidget/RightNowWidget.svelte';
  import RunDurationWidget from '../widgets/RunDurationWidget/RunDurationWidget.svelte';
  import RunMinutesWidget from '../widgets/RunMinutesWidget/RunMinutesWidget.svelte';
  import RunsWidget from '../widgets/RunsWidget/RunsWidget.svelte';
  import SchedulesWidget from '../widgets/SchedulesWidget/SchedulesWidget.svelte';
  import SentenceWidget from '../widgets/SentenceWidget/SentenceWidget.svelte';
  import WebhooksWidget from '../widgets/WebhooksWidget/WebhooksWidget.svelte';
  import SuccessRateWidget from '../widgets/SuccessRateWidget/SuccessRateWidget.svelte';
  import TimelineWidget from '../widgets/TimelineWidget/TimelineWidget.svelte';

  interface Props {
    item: Pick<LayoutWidget, 'data' | 'size'>;
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
  }

  let { item, widgets, period }: Props = $props();

  const size = $derived(shownSize(item.data, item.size));
</script>

{#if item.data === 'summary'}
  <SentenceWidget {widgets} {period} {size} />
{:else if item.data === 'last-24-hours'}
  <TimelineWidget {widgets} {size} />
{:else if item.data === 'right-now'}
  <RightNowWidget {widgets} {size} />
{:else if item.data === 'needs-you'}
  <NeedsYouWidget {widgets} {size} timeZone={period.timeZone ?? 'UTC'} />
{:else if item.data === 'success-rate'}
  <SuccessRateWidget {widgets} {period} {size} />
{:else if item.data === 'agents'}
  <AgentsWidget {widgets} {size} timeZone={period.timeZone ?? 'UTC'} />
{:else if item.data === 'pipelines'}
  <PipelinesWidget {widgets} timeZone={period.timeZone ?? 'UTC'} {size} />
{:else if item.data === 'runs'}
  <RunsWidget {widgets} {period} {size} />
{:else if item.data === 'run-minutes'}
  <RunMinutesWidget {widgets} {period} {size} />
{:else if item.data === 'run-duration'}
  <RunDurationWidget {widgets} {period} {size} />
{:else if item.data === 'activity'}
  <ActivityWidget {widgets} {size} timeZone={period.timeZone ?? 'UTC'} />
{:else if item.data === 'schedules'}
  <SchedulesWidget {widgets} {size} timeZone={period.timeZone ?? 'UTC'} />
{:else if item.data === 'webhooks'}
  <WebhooksWidget {widgets} {size} timeZone={period.timeZone ?? 'UTC'} />
{:else if item.data === 'quick-actions'}
  <QuickActionsWidget {widgets} {size} />
{/if}
