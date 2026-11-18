<script lang="ts">
  import { onDestroy } from 'svelte';
  import { WidgetGrid } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createDashboardPeriod } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import { dashboardView } from '@base/features/dashboard/presentation/ui/dashboard-view.state.svelte.ts';
  import { createDashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import AgentsWidget from '../widgets/AgentsWidget/AgentsWidget.svelte';
  import NeedsYouWidget from '../widgets/NeedsYouWidget/NeedsYouWidget.svelte';
  import PipelinesWidget from '../widgets/PipelinesWidget/PipelinesWidget.svelte';
  import RightNowWidget from '../widgets/RightNowWidget/RightNowWidget.svelte';
  import RunDurationWidget from '../widgets/RunDurationWidget/RunDurationWidget.svelte';
  import RunMinutesWidget from '../widgets/RunMinutesWidget/RunMinutesWidget.svelte';
  import RunsWidget from '../widgets/RunsWidget/RunsWidget.svelte';
  import SentenceWidget from '../widgets/SentenceWidget/SentenceWidget.svelte';
  import SuccessRateWidget from '../widgets/SuccessRateWidget/SuccessRateWidget.svelte';
  import TimelineWidget from '../widgets/TimelineWidget/TimelineWidget.svelte';

  const period = createDashboardPeriod();
  const widgets = createDashboardWidgets(period, () => dashboardView.projectId);
  onDestroy(dashboardView.attach(period));
</script>

<div class="flex w-full flex-col">
  <h1 class="sr-only">{t(dashboardMessages.dashboard)}</h1>
  <WidgetGrid aria-label={t(dashboardMessages.dashboard)}>
    <SentenceWidget {widgets} {period} size="l" />
    <TimelineWidget {widgets} size="m" />
    <RightNowWidget {widgets} size="m" />
    <NeedsYouWidget {widgets} size="l" />
    <SuccessRateWidget {widgets} {period} size="s" />
    <AgentsWidget {widgets} size="s" />
    <PipelinesWidget {widgets} timeZone={period.timeZone ?? 'UTC'} size="m" />
    <RunsWidget {widgets} {period} size="m" />
    <RunMinutesWidget {widgets} {period} size="xs" />
    <RunDurationWidget {widgets} {period} size="xs" />
    <RightNowWidget {widgets} size="xs" />
    <AgentsWidget {widgets} size="xs" />
  </WidgetGrid>
</div>
