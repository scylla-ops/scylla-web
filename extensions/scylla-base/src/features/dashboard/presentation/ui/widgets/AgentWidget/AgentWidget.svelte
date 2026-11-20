<script lang="ts">
  import type { Snippet } from 'svelte';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ServerIcon from '@lucide/svelte/icons/server';
  import { ChartSegment, ChartSlot, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { agentWidgetMessages as messages } from '@base/features/dashboard/presentation/messages/agent-widget.messages.ts';
  import { shortAgo } from '@base/features/dashboard/presentation/presenters/attention.presenter.ts';
  import { periodMeta } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { openAgent, openJob } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import { createAgentWidget } from './agent-widget.state.svelte.ts';
  import LoadBars from './LoadBars.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    target?: string;
    size?: WidgetSize;
    editing?: Snippet;
  }

  let { widgets, period, target, size = 's', editing }: Props = $props();

  const HOT_CPU = 70;

  const view = createAgentWidget(() => widgets, () => period, () => target);
  const agent = $derived(view.agent);
  const cpuBars = $derived(view.bars.map(bar => bar.cpu));
  const ramBars = $derived(view.bars.map(bar => bar.ram));
  const seen = $derived(
    agent?.connected ? t(messages.seenNow) : agent?.lastSeenAt ? t(messages.offlineFor(shortAgo(agent.lastSeenAt))) : '',
  );
</script>

{#snippet dot()}
  <span class={cn('size-2 shrink-0 rounded-full', agent?.connected ? 'bg-status-passed' : 'bg-muted-foreground/40')}></span>
{/snippet}

{#snippet state()}
  <span class={cn('rounded-full px-2 py-0.5 text-xs', agent?.connected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
    {agent?.connected ? t(messages.online) : t(messages.offline)}
  </span>
{/snippet}

{#snippet slots()}
  <span class="flex shrink-0 gap-[3px]" aria-hidden="true">
    {#each view.slots.slice(0, 8) as slot, index (index)}<ChartSlot state={slot} />{/each}
  </span>
{/snippet}

{#snippet chips()}
  <span class="flex flex-wrap gap-1.5">
    {#each view.facts as fact (fact)}<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{fact}</span>{/each}
  </span>
{/snippet}

{#snippet header(meta: string, aside: Snippet)}
  <div class="flex h-5 min-w-0 shrink-0 items-center gap-2">
    {@render dot()}
    <span class="shrink-0 font-display text-[15px] font-medium">{agent?.name}</span>
    {#if meta}<span class="truncate text-xs text-muted-foreground">{meta}</span>{/if}
    <span class="ml-auto shrink-0">{@render aside()}</span>
  </div>
{/snippet}

{#snippet open()}
  <Button variant="ghost" size="xs" class="text-primary" onclick={() => agent && openAgent(agent.id)}>
    {t(messages.openAgent)}<ArrowRightIcon aria-hidden="true" />
  </Button>
{/snippet}

{#snippet meter(label: string, value: number | null, warn: boolean)}
  <div class="flex flex-col gap-1.5">
    <p class="flex items-center text-xs text-muted-foreground">
      <span>{label}</span><span class="ml-auto font-mono text-foreground tabular-nums">{value === null ? '—' : `${value} %`}</span>
    </p>
    <span class="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {#if value !== null}<ChartSegment tone={warn ? 'warning' : 'passed'} class="h-full rounded-full" style="width: {value}%" />{/if}
    </span>
  </div>
{/snippet}

{#snippet figure(value: string, label: string)}
  <div class="flex flex-col">
    <span class="font-display text-[28px] leading-9 font-medium tabular-nums">{value}</span>
    <span class="text-xs text-muted-foreground">{label}</span>
  </div>
{/snippet}

{#snippet strip(label: string)}
  <span class="flex min-w-0 items-center gap-2">
    <span class="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span class="flex h-4 gap-0.5" aria-hidden="true">
      {#each view.recent as tone, index (index)}<ChartSegment {tone} class="h-full w-[7px] rounded-[2px]" />{/each}
    </span>
  </span>
{/snippet}

<Widget
  {size}
  {editing}
  bare
  title={agent?.name ?? t(messages.noTarget)}
  icon={ServerIcon as LucideIcon}
  side={size === 'xs' && agent ? slots : undefined}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadAgents}
    loading={!!target && widgets.agents.isPending && widgets.canReadAgents}
    error={widgets.agents.isError}
    onRetry={() => void widgets.agents.refetch()}
    empty={!agent}
    emptyTitle={view.gone ? t(messages.gone) : t(messages.noTarget)}
    emptyText={view.gone ? t(messages.goneText) : t(messages.noTargetText)}
  >
    {#if agent}
      {#if size === 'xs'}
        <div data-part="agent" class="flex min-w-0 flex-col gap-0.5">
          <span class="flex min-w-0 items-center gap-2">{@render dot()}<span class="truncate font-mono text-[13px]">{agent.name}</span></span>
          <span class="truncate pl-4 text-xs text-muted-foreground">{t(messages.jobsOf(view.busy, view.slots.length))} · {seen}</span>
        </div>
      {:else if size === 's'}
        <div data-part="agent" class="flex min-h-0 flex-1 flex-col gap-3">
          {@render header('', state)}
          <p class="truncate font-mono text-xs text-muted-foreground">{view.facts.join(' · ')}</p>
          <div class="mt-auto flex flex-col gap-3">
            {@render meter(t(messages.cpu), view.load.cpu, (view.load.cpu ?? 0) >= HOT_CPU)}
            {@render meter(t(messages.ram), view.load.ram, false)}
          </div>
          <p class="flex min-w-0 items-center gap-2 text-xs">
            {@render slots()}
            <span class="shrink-0 text-muted-foreground">{t(messages.jobsOf(view.busy, view.slots.length))}</span>
            {#if view.running[0]}<span class="ml-auto truncate font-medium">{view.running[0].pipelineName}</span>{/if}
          </p>
        </div>
      {:else if size === 'm'}
        <div data-part="agent" class="flex min-h-0 flex-1 flex-col gap-3">
          {@render header(view.facts.join(' · '), state)}
          <div class="flex min-h-0 flex-1 gap-6">
            <div class="flex w-[148px] shrink-0 flex-col gap-1.5">
              <span class="text-xs text-muted-foreground">{t(messages.running)}</span>
              {#each view.running.slice(0, 2) as job (job.jobId)}
                <button type="button" class="truncate text-left text-sm font-medium hover:underline" onclick={() => openJob(job)}>{job.pipelineName}</button>
              {:else}
                <span class="text-sm text-muted-foreground">{t(messages.nothingRuns)}</span>
              {/each}
              <span class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{@render slots()}{t(messages.slotsOf(view.busy, view.slots.length))}</span>
              <span class="mt-auto">{@render chips()}</span>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-3">
              <LoadBars class="flex-1" label={t(messages.cpuDay)} value={view.load.cpu} bars={cpuBars} tone="passed" />
              <LoadBars class="flex-1" label={t(messages.ramDay)} value={view.load.ram} bars={ramBars} tone="canceled" />
            </div>
          </div>
        </div>
      {:else}
        <div data-part="agent" class="flex min-h-0 flex-1 flex-col gap-3">
          {@render header(view.facts.join(' · '), open)}
          <div class="flex gap-10">
            {@render figure(view.figures ? String(view.figures.jobs) : '—', t(messages.jobsIn(periodMeta(period.period))))}
            {@render figure(view.figures?.success ?? '—', t(messages.success))}
            {@render figure(view.figures?.median ?? '—', t(messages.median))}
            {@render figure(view.figures?.p95 ?? '—', t(messages.p95))}
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-muted-foreground">{t(messages.nowRunning(view.busy, view.slots.length))}</span>
            {#each view.running.slice(0, 2) as job (job.jobId)}
              <div class="flex h-9 min-w-0 items-center gap-3">
                <span class="flex min-w-0 flex-1 flex-col">
                  <button type="button" class="truncate text-left text-sm font-medium hover:underline" onclick={() => openJob(job)}>{job.pipelineName}</button>
                  {#if job.step}
                    <span class="truncate font-mono text-xs text-muted-foreground">{t(messages.attempt(job.step, job.attempt ?? 1, job.maxAttempts ?? 1))}</span>
                  {/if}
                </span>
                <span class="flex h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  {#if job.progress !== null}<ChartSegment tone="warning" class="h-full rounded-full" style="width: {job.progress * 100}%" />{/if}
                </span>
                <span class="w-14 shrink-0 text-right font-mono text-xs tabular-nums">{job.elapsed}</span>
              </div>
            {:else}
              <span class="text-sm text-muted-foreground">{t(messages.nothingRuns)}</span>
            {/each}
          </div>
          <div class="flex min-h-0 flex-1 gap-6 border-t border-border pt-3">
            <LoadBars class="flex-1" label={t(messages.cpuDay)} value={view.load.cpu} bars={cpuBars} tone="passed" />
            <LoadBars class="flex-1" label={t(messages.ramDay)} value={view.load.ram} bars={ramBars} tone="canceled" />
          </div>
          <div class="flex items-center gap-3">
            {@render strip(t(messages.recentJobs))}
            <span class="ml-auto">{@render chips()}</span>
          </div>
        </div>
      {/if}
    {/if}
  </WidgetBody>
</Widget>
