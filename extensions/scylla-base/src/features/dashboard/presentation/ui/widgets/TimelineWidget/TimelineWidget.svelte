<script lang="ts">
  import type { Snippet } from 'svelte';
  import ActivityIcon from '@lucide/svelte/icons/activity';
  import { ChartDot, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import {
    timelineAxis,
    timelineTicks,
  } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import { jobMarks } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { JobRunMark } from '@shared/presentation/ui';
  import { jobMarkLink } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
    now?: () => number;
  }

  let { widgets, size = 'm', editing, now = Date.now }: Props = $props();

  const MAX_LIVE_DOTS = 5;

  const ended = $derived(widgets.dayJobs.filter(job => job.finishedAt));
  const ticks = $derived(timelineTicks(ended, now()));
  const marks = $derived(jobMarks(ended, widgets.pipelines));
  const failed = $derived(ended.filter(job => job.status === 'failed').length);
  const running = $derived(widgets.liveJobs.filter(job => job.status === 'running').length);
  const waiting = $derived(widgets.liveJobs.length - running);
  const runningDots = $derived(Math.min(running, MAX_LIVE_DOTS));
  const waitingDots = $derived(Math.min(waiting, MAX_LIVE_DOTS - runningDots));
</script>

{#snippet aside()}
  <span class="flex items-center gap-1.5"><ChartDot tone="passed" />{t(widgetMessages.completed)}</span>
  <span class="flex items-center gap-1.5"><ChartDot tone="failed" />{t(widgetMessages.failed)}</span>
  <span class="flex items-center gap-1.5"><ChartDot tone="running" />{t(widgetMessages.orphaned)}</span>
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.lastTwentyFourHours)}
  icon={ActivityIcon as LucideIcon}
  meta={t(messages.jobsAndFailed(ended.length, failed))}
  {aside}
>
  <WidgetBody
    {size}
    retrySeconds={10}
    permission={viewPermissionName('jobs')}
    locked={!widgets.canReadJobs}
    loading={widgets.day.isPending}
    error={widgets.day.isError}
    onRetry={() => void widgets.day.refetch()}
    empty={ended.length === 0 && widgets.liveJobs.length === 0}
    emptyTitle={t(messages.noJobInDay)}
  >
    <div class="flex min-h-0 flex-1 flex-col gap-2">
      <div class="flex min-h-0 flex-1 items-end gap-3">
        <div data-part="timeline" class="relative h-full min-w-0 flex-1 border-b border-border">
          {#each ticks as tick (tick.id)}
            {@const mark = marks.get(tick.id)}
            {#if mark}
              <JobRunMark
                run={mark.run}
                duration={mark.seconds}
                {...jobMarkLink(mark)}
                class="absolute bottom-0 w-[3px] -translate-x-1/2 origin-bottom rounded-t-[1px]"
                style="left: {tick.left}%; height: {tick.height}%"
              >
                <ChartSegment tone={tick.tone === 'canceled' ? 'running' : tick.tone} class="size-full rounded-t-[1px]" />
              </JobRunMark>
            {:else}
              <ChartSegment
                tone={tick.tone === 'canceled' ? 'running' : tick.tone}
                class="absolute bottom-0 w-[3px] -translate-x-1/2 rounded-t-[1px]"
                style="left: {tick.left}%; height: {tick.height}%"
              />
            {/if}
          {/each}
        </div>
        {#if runningDots + waitingDots > 0}
          <div class="flex shrink-0 items-center gap-0.5 pb-1">
            {#each { length: runningDots } as _, index (index)}
              <ChartDot tone="running" class="size-1.5" />
            {/each}
            {#each { length: waitingDots } as _, index (index)}
              <span class="size-1.5 rounded-full border border-foreground/60"></span>
            {/each}
          </div>
        {/if}
      </div>
      <div class="flex justify-between font-mono text-xs text-muted-foreground">
        {#each timelineAxis() as label, index (index)}
          <span>{label}</span>
        {/each}
      </div>
    </div>
  </WidgetBody>
</Widget>
