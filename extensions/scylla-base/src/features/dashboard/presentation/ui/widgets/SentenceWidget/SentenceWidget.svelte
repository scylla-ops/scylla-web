<script lang="ts">
  import type { Snippet } from 'svelte';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ChartDot, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import { liveJobs } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import {
    capacityOf,
    dateLine,
  } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
    now?: () => number;
  }

  let { widgets, period, size = 'l', editing, now = Date.now }: Props = $props();


  const live = $derived(liveJobs(widgets.liveJobs, widgets.pipelines, now()));
  const capacity = $derived(capacityOf(widgets.agents.data ?? []));
  const green = $derived(widgets.pipelineItems.filter(item => item.health === 'green').length);
  const total = $derived(widgets.pipelineItems.length);
  const count = $derived(widgets.attention.data?.openCount ?? 0);
  const waitingForAgent = $derived(live.waiting.filter(row => row.reason === 'agent'));
  const large = $derived(size === 'l');
  const names = (rows: readonly { pipelineName: string }[]) =>
    [...new Set(rows.map(row => row.pipelineName))].join(' · ');
</script>

<Widget {size} {editing} bare title={t(messages.summary)} icon={InboxIcon as LucideIcon}>
  <WidgetBody
    {size}
    retrySeconds={30}
    permission={viewPermissionName('pipelines')}
    locked={!widgets.canReadPipelines || !widgets.canReadJobs}
    loading={widgets.summaries.isPending || widgets.live.isPending || widgets.attention.isPending}
    error={widgets.summaries.isError || widgets.live.isError}
    onRetry={() => void widgets.summaries.refetch()}
  >
    <div data-part="sentence" class="flex min-h-0 flex-1 flex-col">
      <p class="text-xs text-muted-foreground">{dateLine(new Date(now()), period.timeZone ?? 'UTC')}</p>
      <p
        class={cn(
          'mt-3 font-medium tracking-tight',
          large ? 'text-[64px] leading-[0.95]' : 'text-[40px] leading-none',
        )}
      >
        {#if count > 0}
          <span class="text-status-failed">
            {count === 1 ? t(messages.oneThing) : t(messages.things(count))}
          </span>
          <br />
          {count === 1 ? t(messages.needsYouOne) : t(messages.needYou)}
        {:else}
          {t(messages.allClear)}
        {/if}
      </p>
      <p class={cn('mt-4 text-muted-foreground', large ? 'max-w-md text-base' : 'text-sm')}>
        {t(
          (count > 0 ? messages.restIsFine : messages.allIsFine)(
            live.running.length,
            waitingForAgent.length,
            green,
            total,
          ),
        )}
      </p>
      {#if large}
        <ul class="mt-auto flex flex-col gap-4 pb-2 text-sm">
          <li class="flex min-w-0 items-center gap-3">
            <ChartDot tone="running" />
            <span class="shrink-0 font-medium">{t(messages.running(live.running.length))}</span>
            <span class="truncate text-xs text-muted-foreground">{names(live.running)}</span>
          </li>
          <li class="flex min-w-0 items-center gap-3">
            <span class="size-2 shrink-0 rounded-full border border-foreground/60"></span>
            <span class="shrink-0 font-medium">{t(messages.waiting(live.waiting.length))}</span>
            {#if live.waiting[0]}
              <span class="truncate text-xs text-muted-foreground">
                {t(messages.longest(live.waiting[0].waited))}
              </span>
            {/if}
          </li>
          {#if capacity.total > 0}
            <li class="flex min-w-0 items-center gap-3">
              <ChartDot tone={capacity.online === capacity.total ? 'passed' : 'warning'} />
              <span class="shrink-0 font-medium">
                {t(messages.agentsOnline(capacity.online, capacity.total))}
              </span>
              <span class="truncate text-xs text-muted-foreground">
                {capacity.offline ? t(messages.offline(capacity.offline)) : t(messages.allOnline)}
              </span>
            </li>
          {/if}
        </ul>
      {/if}
    </div>
  </WidgetBody>
</Widget>
