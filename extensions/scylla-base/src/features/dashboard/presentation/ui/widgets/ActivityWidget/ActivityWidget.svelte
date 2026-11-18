<script lang="ts">
  import type { Snippet } from 'svelte';
  import HistoryIcon from '@lucide/svelte/icons/history';
  import { ChartDot, Widget, type WidgetSize, type LucideIcon } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { MessageDescriptor } from '@lingui/core';
  import type { JobStatus } from '@base/features/jobs';
  import { widgetMessages as messages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { periodMeta } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import { activityRows } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openJob } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, period, size = 'm', editing }: Props = $props();

  const maxRows = $derived(size === 'l' ? 12 : 5);

  const ENDS: Partial<Record<JobStatus, MessageDescriptor>> = {
    completed: messages.completedLower,
    failed: messages.failedLower,
    cancelled: messages.cancelled,
    orphaned: messages.orphanedLower,
  };

  const rows = $derived(
    activityRows(widgets.ended.data ?? [], widgets.pipelines, new Date(), period.timeZone ?? 'UTC'),
  );
</script>

<Widget
  {size}
  {editing}
  title={t(messages.activity)}
  icon={HistoryIcon as LucideIcon}
  meta={`${t(messages.jobEnds)} · ${periodMeta(period.period)}`}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={widgets.ended.isPending}
    error={widgets.ended.isError}
    onRetry={() => void widgets.ended.refetch()}
    empty={rows.length === 0}
    emptyTitle={t(messages.noEndedJobsInPeriod)}
    emptyText={t(messages.noJobsInPeriodText)}
  >
    <ul class="flex min-h-0 flex-col gap-1.5">
      {#each rows.slice(0, maxRows) as row (row.jobId)}
        {@const end = ENDS[row.status]}
        <li>
          <button
            type="button"
            class="flex w-full min-w-0 items-center gap-2 text-left text-sm"
            onclick={() => openJob(row)}
          >
            <ChartDot tone={row.tone} />
            <span class="truncate font-medium">{row.pipelineName}</span>
            <span class="shrink-0 font-mono text-xs text-muted-foreground">{row.shortId}</span>
            <span class="truncate text-xs text-muted-foreground">
              {end ? t(end) : ''}{row.projectName ? ` · ${row.projectName}` : ''}
            </span>
            <span class="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{row.when}</span>
          </button>
        </li>
      {/each}
    </ul>
  </WidgetBody>
</Widget>
