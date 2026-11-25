<script lang="ts">
  import type { Snippet } from 'svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import LoaderIcon from '@lucide/svelte/icons/loader';
  import PlayIcon from '@lucide/svelte/icons/play';
  import XIcon from '@lucide/svelte/icons/x';
  import { ChartDot, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { JobRunMark } from '@shared/presentation/ui';
  import { pipelineWidgetMessages as messages } from '@base/features/dashboard/presentation/messages/pipeline-widget.messages.ts';
  import { shortAgo } from '@base/features/dashboard/presentation/presenters/attention.presenter.ts';
  import { periodMeta } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { linkMessages } from '@base/features/dashboard/presentation/messages/links.messages.ts';
  import { jobLink, jobMarkLink, pipelineJobsLink } from '../widget-navigation.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import WidgetLink from '../parts/WidgetLink.svelte';
  import { createPipelineWidget } from './pipeline-widget.state.svelte.ts';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    target?: string;
    size?: WidgetSize;
    editing?: Snippet;
  }

  let { widgets, period, target, size = 'm', editing }: Props = $props();

  const XS_RUNS = 10;
  const L_RUNS = 6;
  const OUTCOMES = {
    completed: messages.completed,
    failed: messages.failed,
    cancelled: messages.cancelled,
    orphaned: messages.orphaned,
  } as const;

  const view = createPipelineWidget(() => widgets, () => period, () => target);
  const summary = $derived(view.summary);
  const row = $derived(view.row);
  const last = $derived(view.lastRun);
  const lastText = $derived(
    last && last.status in OUTCOMES
      ? t(messages.lastRun(last.shortId, t(OUTCOMES[last.status as keyof typeof OUTCOMES]), shortAgo(last.at)))
      : t(messages.noRun),
  );
  const onText = $derived(row ? [t(messages.onTrigger(row.trigger)), last?.branch].filter(Boolean).join(' · ') : '');
  const ICONS = { passed: CheckIcon, failed: XIcon, running: LoaderIcon } as const;
  const Icon = $derived(ICONS[view.tone as keyof typeof ICONS] ?? CircleDashedIcon);
</script>

{#snippet header(meta: string, aside: Snippet)}
  <div class="flex h-6 min-w-0 shrink-0 items-center gap-2">
    <Icon
      aria-hidden="true"
      class={cn('size-4 shrink-0', view.tone === 'failed' ? 'text-status-failed' : view.tone === 'passed' ? 'text-status-passed' : 'text-muted-foreground')}
    />
    <WidgetLink link={pipelineJobsLink(summary)} title={t(linkMessages.openJobs)} class="shrink-0 font-display text-[15px] font-medium">
      {summary?.name}
    </WidgetLink>
    {#if meta}<span class="truncate text-xs text-muted-foreground">{meta}</span>{/if}
    <span class="ml-auto shrink-0">{@render aside()}</span>
  </div>
{/snippet}

{#snippet project()}
  <span class="rounded-full border border-border px-2 py-0.5 text-xs">{summary?.projectName}</span>
{/snippet}

{#snippet runButton()}
  {#if view.canRun}
    <Button variant="outline" size="xs" disabled={view.isRunning} title={t(messages.runNow)} onclick={() => void view.run()}>
      <PlayIcon aria-hidden="true" />{t(messages.run)}
    </Button>
  {/if}
{/snippet}

{#snippet strip(className: string, count: number)}
  <span class={cn('flex gap-1', className)} role="group" aria-label={t(messages.lastRuns(count))}>
    {#each (row?.runs ?? []).slice(-count) as mark (mark.jobId)}
      <JobRunMark run={mark.run} duration={mark.seconds} class="h-full min-w-0 flex-1 rounded-[3px]" {...jobMarkLink(mark)}>
        <ChartSegment tone={mark.tone} class="size-full rounded-[3px]" />
      </JobRunMark>
    {/each}
  </span>
{/snippet}

{#snippet figure(value: string, label: string)}
  <div class="flex flex-col">
    <span class="font-display text-[28px] leading-9 font-medium tabular-nums">{value}</span>
    <span class="text-xs text-muted-foreground">{label}</span>
  </div>
{/snippet}

{#snippet side()}
  <span class="flex h-[34px] w-[60px] items-end gap-0.5" role="group" aria-label={t(messages.lastRuns(XS_RUNS))}>
    {#each (row?.runs ?? []).slice(-XS_RUNS) as mark (mark.jobId)}
      <JobRunMark run={mark.run} duration={mark.seconds} class="h-3/5 min-w-0 flex-1 rounded-[1px]" {...jobMarkLink(mark)}>
        <ChartSegment tone={mark.tone} class="size-full rounded-[1px]" />
      </JobRunMark>
    {/each}
  </span>
{/snippet}

<Widget
  {size}
  {editing}
  bare
  title={summary?.name ?? t(messages.noTarget)}
  icon={GitBranchIcon as LucideIcon}
  side={size === 'xs' && row ? side : undefined}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadPipelines}
    loading={!!target && view.summaries.isPending && widgets.canReadPipelines}
    error={view.summaries.isError}
    onRetry={() => void view.summaries.refetch()}
    empty={!summary || !row}
    emptyTitle={view.gone ? t(messages.gone) : t(messages.noTarget)}
    emptyText={view.gone ? t(messages.goneText) : t(messages.noTargetText)}
  >
    {#if summary && row}
      {#if size === 'xs'}
        <div data-part="pipeline" class="flex min-w-0 flex-col gap-0.5">
          <span class="flex min-w-0 items-center gap-1.5">
            <Icon aria-hidden="true" class={cn('size-3.5 shrink-0', view.tone === 'failed' ? 'text-status-failed' : 'text-status-passed')} />
            <WidgetLink link={pipelineJobsLink(summary)} title={t(linkMessages.openJobs)} class="truncate text-sm font-medium">{summary.name}</WidgetLink>
          </span>
          <span class="truncate text-xs text-muted-foreground">{row.rate} · {t(messages.medianOf(row.median))}</span>
        </div>
      {:else if size === 's'}
        <div data-part="pipeline" class="flex min-h-0 flex-1 flex-col gap-2">
          {@render header('', project)}
          <WidgetLink link={last ? view.jobLink(last.id) : null} title={t(linkMessages.openJob)} class="truncate text-xs text-muted-foreground">
            {lastText}
          </WidgetLink>
          <p class="mt-auto flex items-baseline gap-2">
            <span class="font-display text-[34px] leading-10 font-medium tabular-nums">{row.rate}</span>
            <span class="truncate text-xs text-muted-foreground">{t(messages.successLastRuns(row.strip.length))}</span>
          </p>
          {@render strip('h-3', row.strip.length)}
          <p class="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t(messages.medianOf(row.median))}</span>
            <span class="ml-auto truncate">{onText}</span>
          </p>
        </div>
      {:else}
        <div data-part="pipeline" class="flex min-h-0 flex-1 flex-col gap-3">
          {@render header(`${summary.projectName} · ${row.trigger}`, runButton)}
          <div class="flex gap-10">
            {@render figure(row.rate, t(messages.success))}
            {@render figure(row.median, t(messages.median))}
            {@render figure(view.runs === null ? '—' : String(view.runs), t(messages.runsIn(periodMeta(period.period))))}
            {@render figure(last ? shortAgo(last.at) : '—', t(messages.sinceLastRun))}
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-muted-foreground">{t(messages.lastRuns(row.strip.length))}</span>
            {@render strip('h-[18px]', row.strip.length)}
          </div>
          {#if view.stages.length > 0}
            <div class="flex min-w-0 flex-wrap items-center gap-1.5">
              <WidgetLink link={view.newestId ? view.jobLink(view.newestId) : null} title={t(linkMessages.openJob)} class="font-mono text-xs text-muted-foreground">
                {view.newestShortId}
              </WidgetLink>
              {#each view.stages as stage (stage.id)}
                <WidgetLink
                  link={view.newestId ? view.jobLink(view.newestId, stage.id) : null}
                  title={t(linkMessages.openNode(stage.id))}
                  class="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted"
                >
                  <ChartDot tone={stage.tone} />{stage.id}
                </WidgetLink>
              {/each}
            </div>
          {/if}
          {#if size === 'l'}
            <div class="flex min-h-0 flex-col gap-1 border-t border-border pt-3">
              <span class="text-xs text-muted-foreground">{t(messages.recentRuns)}</span>
              {#each row.runs.slice(-L_RUNS).reverse() as run, index (index)}
                <p class="flex h-6 min-w-0 items-center gap-3 text-xs">
                  <ChartDot tone={run.tone} />
                  <WidgetLink link={jobLink(run)} title={t(linkMessages.openJob)} class="w-20 shrink-0 font-mono">{run.shortId}</WidgetLink>
                  <span class="min-w-0 flex-1 truncate text-muted-foreground">{run.branch}</span>
                  <span class="w-16 shrink-0 text-right font-mono tabular-nums">{run.duration}</span>
                  <span class="w-14 shrink-0 text-right text-muted-foreground tabular-nums">{run.when}</span>
                </p>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </WidgetBody>
</Widget>
