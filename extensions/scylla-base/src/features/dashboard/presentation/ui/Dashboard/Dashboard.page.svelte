<script lang="ts">
  import { FeatureHeader, WidgetGrid } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createDashboardPeriod } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import { createDashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import { utcOffsetLabel } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import PeriodPicker from '../PeriodPicker/PeriodPicker.svelte';
  import ActivityWidget from '../widgets/ActivityWidget/ActivityWidget.svelte';
  import NeedsYouWidget from '../widgets/NeedsYouWidget/NeedsYouWidget.svelte';
  import PipelinesWidget from '../widgets/PipelinesWidget/PipelinesWidget.svelte';
  import QuickActionsWidget from '../widgets/QuickActionsWidget/QuickActionsWidget.svelte';
  import RightNowWidget from '../widgets/RightNowWidget/RightNowWidget.svelte';
  import RunDurationWidget from '../widgets/RunDurationWidget/RunDurationWidget.svelte';
  import SuccessRateWidget from '../widgets/SuccessRateWidget/SuccessRateWidget.svelte';
  import { dashboardMessages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';

  const dashboardPeriod = createDashboardPeriod();
  const widgets = createDashboardWidgets(dashboardPeriod);
</script>

{#snippet underLabel()}
  {#if dashboardPeriod.timeZone}
    <p class="text-sm text-muted-foreground">
      {t(
        dashboardMessages.timesIn(
          dashboardPeriod.timeZone,
          utcOffsetLabel(dashboardPeriod.timeZone, new Date()),
        ),
      )}
    </p>
  {/if}
{/snippet}

{#snippet extraActions()}
  <PeriodPicker
    period={dashboardPeriod.period}
    today={dashboardPeriod.today}
    onSelect={dashboardPeriod.select}
    onApplyCustom={dashboardPeriod.applyCustom}
  />
{/snippet}

<div class="flex h-full min-h-0 w-full flex-col gap-4">
  <FeatureHeader label={t(dashboardMessages.dashboard)} {underLabel} {extraActions} />

  <WidgetGrid class="shrink-0">
    <SuccessRateWidget {widgets} period={dashboardPeriod} />
    <RunDurationWidget {widgets} period={dashboardPeriod} />
    <RightNowWidget {widgets} />
    <NeedsYouWidget {widgets} period={dashboardPeriod} />
    <PipelinesWidget {widgets} timeZone={dashboardPeriod.timeZone ?? 'UTC'} />
    <ActivityWidget {widgets} period={dashboardPeriod} />
    <QuickActionsWidget {widgets} />
  </WidgetGrid>
</div>
