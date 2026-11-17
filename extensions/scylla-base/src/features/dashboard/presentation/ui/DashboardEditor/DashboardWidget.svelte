<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import { shownSize } from '@base/features/dashboard/presentation/presenters/widget-sizes.presenter.ts';
  import ActivityWidget from '../widgets/ActivityWidget/ActivityWidget.svelte';
  import NeedsYouWidget from '../widgets/NeedsYouWidget/NeedsYouWidget.svelte';
  import PipelinesWidget from '../widgets/PipelinesWidget/PipelinesWidget.svelte';
  import QuickActionsWidget from '../widgets/QuickActionsWidget/QuickActionsWidget.svelte';
  import RightNowWidget from '../widgets/RightNowWidget/RightNowWidget.svelte';
  import RunDurationWidget from '../widgets/RunDurationWidget/RunDurationWidget.svelte';
  import SuccessRateWidget from '../widgets/SuccessRateWidget/SuccessRateWidget.svelte';

  interface Props {
    item: LayoutWidget;
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    editing?: Snippet;
  }

  let { item, widgets, period, editing }: Props = $props();

  const size = $derived(shownSize(item.widget, item.size));
</script>

{#if item.widget === 'success-rate'}
  <SuccessRateWidget {widgets} {period} {size} {editing} />
{:else if item.widget === 'run-duration'}
  <RunDurationWidget {widgets} {period} {size} {editing} />
{:else if item.widget === 'right-now'}
  <RightNowWidget {widgets} {size} {editing} />
{:else if item.widget === 'needs-you'}
  <NeedsYouWidget {widgets} {period} {size} {editing} />
{:else if item.widget === 'pipelines'}
  <PipelinesWidget {widgets} timeZone={period.timeZone ?? 'UTC'} {size} {editing} />
{:else if item.widget === 'activity'}
  <ActivityWidget {widgets} {period} {size} {editing} />
{:else if item.widget === 'quick-actions'}
  <QuickActionsWidget {widgets} {size} {editing} />
{/if}
