<script lang="ts">
  import type { Snippet } from 'svelte';
  import RadioIcon from '@lucide/svelte/icons/radio';
  import { ChartDot, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import { liveJobs } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { capacityOf } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
    now?: () => number;
  }

  let { widgets, size = 'm', editing, now = Date.now }: Props = $props();

  const DOTS = 3;

  const live = $derived(liveJobs(widgets.liveJobs, widgets.pipelines, now()));
  const capacity = $derived(capacityOf(widgets.agents.data ?? []));
  const names = $derived([...new Set(live.running.map(row => row.pipelineName))].join(' · '));
  const dots = (count: number) => Math.min(count, DOTS);
</script>

{#snippet marks(count: number, kind: 'running' | 'waiting' | 'online')}
  <div data-part="status-marks" aria-hidden="true" class="flex h-2 items-center gap-1">
    {#each { length: Math.max(1, dots(count)) } as _, index (index)}
      {#if kind === 'waiting'}
        <span class={cn('size-2 rounded-full border', count > 0 ? 'border-foreground/60' : 'border-muted-foreground/40')}></span>
      {:else if count > 0}
        <ChartDot tone={kind === 'running' ? 'running' : 'passed'} />
      {:else}
        <span class="size-2 rounded-full bg-muted-foreground/30"></span>
      {/if}
    {/each}
  </div>
{/snippet}

<Widget {size} {editing} bare={size === 'xs'} title={t(widgetMessages.rightNow)} icon={RadioIcon as LucideIcon}>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={widgets.live.isPending}
    error={widgets.live.isError}
    onRetry={() => void widgets.live.refetch()}
  >
    {#if size === 'xs'}
      <div class="flex min-w-0 items-center gap-4">
        {@render marks(live.running.length, 'running')}
        <div class="min-w-0">
          <p class="text-sm font-medium">{t(messages.running(live.running.length))}</p>
          <p class="truncate text-xs text-muted-foreground">
            {t(messages.waiting(live.waiting.length))}
          </p>
        </div>
      </div>
    {:else}
      <div data-part="status-band" class="mt-auto mb-auto grid grid-cols-3">
        <div class="flex min-w-0 flex-col gap-2 pr-4">
          {@render marks(live.running.length, 'running')}
          <p class="text-2xl font-medium tracking-tight">{t(messages.running(live.running.length))}</p>
          <p class="truncate text-xs text-muted-foreground">{names || t(messages.nothingRuns)}</p>
        </div>
        <div class="flex min-w-0 flex-col gap-2 border-l border-border px-4">
          {@render marks(live.waiting.length, 'waiting')}
          <p class="text-2xl font-medium tracking-tight">{t(messages.waiting(live.waiting.length))}</p>
          <p class="truncate text-xs text-muted-foreground">
            {live.waiting[0] ? t(messages.longest(live.waiting[0].waited)) : t(messages.nothingWaits)}
          </p>
        </div>
        <div class="flex min-w-0 flex-col gap-2 border-l border-border pl-4">
          {@render marks(capacity.online, 'online')}
          <p class="text-2xl font-medium tracking-tight">
            {capacity.total > 0 ? t(messages.agentsOf(capacity.online, capacity.total)) : t(messages.noAgent)}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            {capacity.offline ? t(messages.offline(capacity.offline)) : t(messages.allOnline)}
          </p>
        </div>
      </div>
    {/if}
  </WidgetBody>
</Widget>
