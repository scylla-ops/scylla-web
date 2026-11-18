<script lang="ts">
  import type { Snippet } from 'svelte';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import { ChartSlot, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { viewMessages as messages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
  import { capacityOf } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 's', editing }: Props = $props();

  const MAX_SLOTS = 12;

  const capacity = $derived(capacityOf(widgets.agents.data ?? []));
  const slots = $derived(capacity.states.slice(0, MAX_SLOTS));
</script>

{#snippet aside()}
  {#if capacity.total > 0}
    <span>{t(messages.ofTotal(capacity.online, capacity.total))}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  bare={size === 'xs'}
  title={t(messages.agents)}
  icon={GaugeIcon as LucideIcon}
  {aside}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadAgents}
    loading={widgets.agents.isPending && widgets.canReadAgents}
    error={widgets.agents.isError}
    onRetry={() => void widgets.agents.refetch()}
    empty={capacity.total === 0}
    emptyTitle={t(messages.noAgent)}
  >
    {#if size === 'xs'}
      <div class="flex min-w-0 items-center gap-4">
        <p class="text-3xl font-medium tracking-tight tabular-nums">
          {capacity.online}/{capacity.total}
        </p>
        <div class="min-w-0">
          <p class="text-sm">{t(messages.agentsOnlineLower)}</p>
          <p class="truncate text-xs text-muted-foreground">
            {t(messages.slotsBusy(capacity.busy, capacity.slots))}
          </p>
        </div>
      </div>
    {:else}
      <div class="mt-auto flex flex-col gap-3">
        <p class="text-6xl font-medium tracking-tight tabular-nums">
          {capacity.online}/{capacity.total}
        </p>
        <div class="flex flex-wrap gap-1">
          {#each slots as state, index (index)}
            <ChartSlot {state} class="size-[22px] rounded-[4px]" />
          {/each}
        </div>
        <p class="text-xs text-muted-foreground">{t(messages.slotsBusy(capacity.busy, capacity.slots))}</p>
      </div>
    {/if}
  </WidgetBody>
</Widget>
