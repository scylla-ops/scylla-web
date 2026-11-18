<script lang="ts">
  import type { Snippet } from 'svelte';
  import BotIcon from '@lucide/svelte/icons/bot';
  import ServerIcon from '@lucide/svelte/icons/server';
  import { ChartSegment, ChartSlot, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AppEntity } from '@base/features/apps';
  import { capacityMessages as messages } from '@base/features/dashboard/presentation/messages/capacity.messages.ts';
  import { durationText } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import { capacityOf } from '@base/features/dashboard/presentation/presenters/view-figures.presenter.ts';
  import { shortAgo } from '@base/features/dashboard/presentation/presenters/attention.presenter.ts';
  import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    timeZone?: string;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
  }

  let { widgets, size = 's', timeZone = 'UTC', editing }: Props = $props();

  const XS_SLOTS = 8;
  const HOT_CPU = 70;
  const BYTES_IN_MB = 1024 * 1024;

  const agents = $derived(
    (widgets.agents.data ?? [])
      .filter(agent => !agent.disabledAt)
      .sort((a, b) => Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name)),
  );
  const capacity = $derived(capacityOf(agents));
  const usage = $derived(widgets.slotUsage.data);
  const hot = $derived(Math.max(1, (usage?.capacity ?? capacity.slots) - 1));
  const highest = $derived(Math.max(1, usage?.capacity ?? 0, ...(usage?.buckets ?? []).map(item => item.average)));
  const wait = $derived(widgets.stats.data?.totals.p50Queue ?? null);

  const slotsOf = (agent: AppEntity): ('busy' | 'free' | 'offline')[] => {
    const slots = Math.max(1, agent.host?.capacity ?? 1);
    const busy = agent.connected ? Math.min(slots, agent.runningJobs) : 0;
    return Array.from({ length: agent.connected ? slots : 1 }, (_, index) =>
      !agent.connected ? 'offline' : index < busy ? 'busy' : 'free',
    );
  };

  const hostLine = (agent: AppEntity): string => {
    const host = agent.host;
    if (!host) return '';
    const last = host.containerRuntime
      ? host.cpuCount
        ? t(messages.cpuCount(host.cpuCount))
        : ''
      : t(messages.noRuntime);
    return [host.os, host.arch, last].filter(Boolean).join(' · ');
  };

  const cpu = (agent: AppEntity) => (agent.connected && agent.lastSample ? Math.round(agent.lastSample.cpuPercent) : null);
  const ram = (agent: AppEntity) =>
    agent.connected && agent.lastSample && agent.host?.totalMemoryMb
      ? Math.round((agent.lastSample.memoryUsedBytes / (agent.host.totalMemoryMb * BYTES_IN_MB)) * 100)
      : null;

  const hourLabels = $derived.by(() => {
    const buckets = usage?.buckets ?? [];
    if (buckets.length < 2) return [];
    const step = Math.floor((buckets.length - 1) / 4);
    return [0, step, step * 2, step * 3].map(index => clockIn(new Date(buckets[index].start), timeZone)).concat(t(widgetMessages.now));
  });
</script>

{#snippet agentIcon(agent: AppEntity)}
  <span class="relative flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-primary/10">
    <BotIcon aria-hidden="true" class="size-3 text-primary" />
    <span class={cn('absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full ring-1 ring-background', agent.connected ? 'bg-status-passed' : 'bg-muted-foreground/40')}></span>
  </span>
{/snippet}

{#snippet meter(value: number | null, warn: boolean)}
  {#if value === null}
    <span class="ml-auto text-muted-foreground">—</span>
  {:else}
    <span class="flex h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <ChartSegment tone={warn ? 'warning' : 'passed'} class="h-full rounded-full" style="width: {Math.min(100, value)}%" />
    </span>
    <span class="ml-auto tabular-nums">{value} %</span>
  {/if}
{/snippet}

{#snippet table()}
  <table data-part="capacity-table" class="w-full table-fixed text-left text-xs">
    <thead>
      <tr class="text-muted-foreground">
        <th class="w-6 pb-2 font-normal"><span class="sr-only">{t(messages.agent)}</span></th>
        <th class="pb-2 font-normal">{t(messages.agent)}</th>
        <th class="w-[78px] pb-2 font-normal">{t(messages.slots)}</th>
        <th class="w-[92px] pb-2 font-normal">{t(messages.cpu)}</th>
        <th class="w-[84px] pb-2 font-normal">{t(messages.ram)}</th>
      </tr>
    </thead>
    <tbody>
      {#each agents as agent (agent.id)}
        <tr class="h-6">
          <td>{@render agentIcon(agent)}</td>
          <td class="pr-2">
            <span class="flex min-w-0 items-baseline gap-1.5">
              <span class={cn('shrink-0 font-mono text-[13px]', !agent.connected && 'text-muted-foreground')}>{agent.name}</span>
              <span class="truncate text-muted-foreground">
                {agent.connected ? hostLine(agent) : t(messages.offlineFor(shortAgo(agent.lastSeenAt)))}
              </span>
            </span>
          </td>
          <td>
            <span class="flex gap-[3px]">
              {#each slotsOf(agent).slice(0, 4) as state, index (index)}<ChartSlot {state} />{/each}
            </span>
          </td>
          <td><span class="flex items-center gap-1.5 pr-2">{@render meter(cpu(agent), (cpu(agent) ?? 0) >= HOT_CPU)}</span></td>
          <td><span class="flex items-center gap-1.5">{@render meter(ram(agent), false)}</span></td>
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}

{#snippet aside()}
  {#if capacity.total > 0}
    <span>{size === 'xs' ? t(messages.agentsOf(capacity.online, capacity.total)) : t(messages.onlineOf(capacity.online, capacity.total))}</span>
  {/if}
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.title)}
  icon={ServerIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(messages.agents)}
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
      <div data-part="capacity" class="flex h-7 min-w-0 items-center gap-1.5">
        <span class="font-display text-xl font-medium tabular-nums">{capacity.busy}/{capacity.slots}</span>
        <span class="text-xs text-muted-foreground">{t(messages.slotsBusy)}</span>
        <span class="ml-auto flex shrink-0 gap-[3px]" aria-hidden="true">
          {#each capacity.states.filter(state => state !== 'offline').slice(0, XS_SLOTS) as state, index (index)}
            <ChartSlot {state} />
          {/each}
        </span>
      </div>
    {:else if size === 's'}
      <div data-part="capacity" class="flex min-h-0 flex-col gap-3">
        <p class="flex items-baseline gap-1.5">
          <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{capacity.busy}</span>
          <span class="text-[15px] text-muted-foreground">{t(messages.ofSlotsBusy(capacity.slots))}</span>
        </p>
        <ul class="flex flex-col gap-1.5">
          {#each agents.slice(0, 4) as agent (agent.id)}
            <li class="flex h-[18px] min-w-0 items-center gap-2">
              {@render agentIcon(agent)}
              <span class={cn('truncate font-mono text-[13px]', !agent.connected && 'text-muted-foreground')}>{agent.name}</span>
              <span class="ml-auto flex shrink-0 gap-[3px]">
                {#each slotsOf(agent).slice(0, 4) as state, index (index)}<ChartSlot {state} />{/each}
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {:else if size === 'm'}
      <div data-part="capacity">{@render table()}</div>
    {:else}
      <div data-part="capacity" class="flex min-h-0 flex-1 flex-col gap-4">
        <dl class="flex gap-8">
          <div class="flex flex-col">
            <dd class="font-display text-xl leading-7 font-medium tabular-nums">{capacity.busy} / {capacity.slots}</dd>
            <dt class="text-xs text-muted-foreground">{t(messages.slotsBusy)}</dt>
          </div>
          <div class="flex flex-col">
            <dd class="font-display text-xl leading-7 font-medium tabular-nums">{capacity.online} / {capacity.total}</dd>
            <dt class="text-xs text-muted-foreground">{t(messages.agentsOnline)}</dt>
          </div>
          {#if wait !== null}
            <div class="flex flex-col">
              <dd class="font-display text-xl leading-7 font-medium tabular-nums">{durationText(wait)}</dd>
              <dt class="text-xs text-muted-foreground">{t(messages.waitP50)}</dt>
            </div>
          {/if}
        </dl>
        {@render table()}
        {#if usage}
          <div class="mt-auto flex flex-col gap-1.5">
            <p class="flex items-center text-xs">
              <span>{t(messages.busyLastDay)}</span>
              <span class="ml-auto text-muted-foreground">{t(messages.averagePerHour(usage.capacity))}</span>
            </p>
            <div class="flex h-[88px] items-end gap-1" role="img" aria-label={t(messages.busyLastDay)}>
              {#each usage.buckets as bucket (bucket.start)}
                <ChartSegment
                  tone={bucket.average >= hot ? 'warning' : 'passed'}
                  class="min-w-0 flex-1 rounded-[2px]"
                  style="height: {Math.max(3, (bucket.average / highest) * 100)}%"
                />
              {/each}
            </div>
            {#if hourLabels.length}
              <div class="flex justify-between text-xs text-muted-foreground tabular-nums">
                {#each hourLabels as label, index (index)}<span>{label}</span>{/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </WidgetBody>
</Widget>
