<script lang="ts">
  import type { Snippet } from 'svelte';
  import ActivityIcon from '@lucide/svelte/icons/activity';
  import { ChartDot, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { liveMessages as messages } from '@base/features/dashboard/presentation/messages/live.messages.ts';
  import {
    liveJobs,
    type RunningRow,
    type WaitingRow,
  } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';
  import LiveWaitingActions from './LiveWaitingActions.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
    now?: () => number;
  }

  let { widgets, size = 'm', editing, now = Date.now }: Props = $props();

  const ROWS: Readonly<Record<WidgetSize, number>> = { xs: 0, s: 4, m: 3, l: 3 };

  const agentNames = $derived(new Map((widgets.agents.data ?? []).map(agent => [agent.id, agent.name])));
  const live = $derived(liveJobs(widgets.liveJobs, widgets.pipelines, now()));
  const running = $derived(live.running.slice(0, ROWS[size]));
  const waiting = $derived(live.waiting.slice(0, ROWS[size]));
  const firstJobs = $derived([...live.running, ...live.waiting].slice(0, ROWS.s));

  const times = (row: RunningRow) =>
    row.overrun ? `${row.elapsed} · ${row.overrun}` : row.expected ? `${row.elapsed} · ~${row.expected}` : row.elapsed;

  const detail = (row: RunningRow) =>
    [
      row.agentId ? agentNames.get(row.agentId) : undefined,
      row.step,
      row.attempt
        ? row.maxAttempts && row.maxAttempts > 1
          ? t(messages.attemptOf(row.attempt, row.maxAttempts))
          : t(messages.attempt(row.attempt))
        : undefined,
    ]
      .filter(Boolean)
      .join(' · ');

  const isRunning = (row: RunningRow | WaitingRow): row is RunningRow => 'elapsed' in row;
</script>

{#snippet counts()}
  <div class="flex h-7 items-center gap-4">
    <span class="flex items-center gap-1.5">
      <ChartDot tone="running" />
      <span class="font-display text-xl font-medium tabular-nums">{live.running.length}</span>
      <span class="text-xs text-muted-foreground">{t(messages.running)}</span>
    </span>
    <span class="flex items-center gap-1.5">
      <ChartDot tone="queued" />
      <span class="font-display text-xl font-medium tabular-nums">{live.waiting.length}</span>
      <span class="text-xs text-muted-foreground">{t(messages.waiting)}</span>
    </span>
  </div>
{/snippet}

{#snippet meter(row: RunningRow)}
  {#if row.progress !== null}
    <div class="flex h-1 w-full gap-0.5" aria-hidden="true">
      <ChartSegment tone="running" class="h-full rounded-full" style="flex: {row.progress} 1 0" />
      {#if row.progress < 1}
        <ChartSegment tone="muted" class="h-full rounded-full" style="flex: {1 - row.progress} 1 0" />
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet section(label: string, hint: string)}
  <p class="flex items-center gap-2 text-xs text-muted-foreground">
    <span>{label}</span>
    <span class="ml-auto truncate">{hint}</span>
  </p>
{/snippet}

{#snippet aside()}
  <span>{t(messages.live)}</span>
{/snippet}

<Widget
  {size}
  {editing}
  title={t(widgetMessages.rightNow)}
  icon={ActivityIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(messages.live)}
  aside={size === 'xs' ? aside : undefined}
>
  <WidgetBody
    {size}
    retrySeconds={5}
    permission={viewPermissionName('jobs')}
    locked={!widgets.canReadJobs}
    loading={widgets.live.isPending}
    error={widgets.live.isError}
    onRetry={() => void widgets.live.refetch()}
  >
    {#if size === 'xs'}
      <div data-part="right-now">{@render counts()}</div>
    {:else if size === 's'}
      <div data-part="right-now" class="flex min-h-0 flex-col gap-2">
        {@render counts()}
        <ul class="flex flex-col gap-1.5">
          {#each firstJobs as row (row.jobId)}
            <li class="flex h-5 min-w-0 items-center gap-1.5">
              <ChartDot tone={isRunning(row) ? 'running' : 'queued'} />
              <span class="truncate text-sm font-medium">{row.pipelineName}</span>
              <span class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">
                {isRunning(row) ? row.elapsed : row.waited}
              </span>
            </li>
          {:else}
            <li class="text-xs text-muted-foreground">{t(messages.nothingRuns)}</li>
          {/each}
        </ul>
      </div>
    {:else if size === 'm'}
      <div data-part="right-now" class="flex min-h-0 flex-1 gap-4">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          {@render section(t(messages.runningSection(live.running.length)), t(messages.elapsedMedian))}
          <ul class="flex flex-col gap-2">
            {#each running as row (row.jobId)}
              <li class="flex flex-col gap-1">
                <p class="flex h-5 min-w-0 items-center gap-1.5">
                  <ChartDot tone="running" />
                  <span class="truncate text-sm font-medium">{row.pipelineName}</span>
                  <span class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{times(row)}</span>
                </p>
                {@render meter(row)}
              </li>
            {:else}
              <li class="text-xs text-muted-foreground">{t(messages.nothingRuns)}</li>
            {/each}
          </ul>
        </div>
        <span class="w-px self-stretch bg-border" aria-hidden="true"></span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          {@render section(t(messages.waitingSection(live.waiting.length)), t(messages.waits))}
          <ul class="flex flex-col gap-2">
            {#each waiting as row (row.jobId)}
              <li class="flex h-5 min-w-0 items-center gap-1.5">
                <ChartDot tone="queued" />
                <span class="truncate text-sm font-medium">{row.pipelineName}</span>
                <span class="shrink-0 text-xs text-muted-foreground">
                  {t(row.reason === 'approval' ? messages.reasonApproval : messages.reasonAgent)}
                </span>
                <span class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{row.waited}</span>
              </li>
            {:else}
              <li class="text-xs text-muted-foreground">{t(messages.nothingWaits)}</li>
            {/each}
          </ul>
        </div>
      </div>
    {:else}
      <div data-part="right-now" class="flex min-h-0 flex-1 flex-col gap-4">
        <div class="flex flex-col gap-3">
          {@render section(t(messages.runningSection(live.running.length)), t(messages.elapsedMedianLong))}
          <ul class="flex flex-col gap-3">
            {#each running as row (row.jobId)}
              <li class="flex flex-col gap-1">
                <p class="flex h-5 min-w-0 items-center gap-1.5">
                  <ChartDot tone="running" />
                  <span class="truncate text-sm font-medium">{row.pipelineName}</span>
                  <span class="shrink-0 text-xs text-muted-foreground">{row.projectName}</span>
                  <span class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{times(row)}</span>
                </p>
                <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="shrink-0 font-mono">{row.shortId}</span>
                  <span class="truncate">{detail(row)}</span>
                </p>
                {@render meter(row)}
              </li>
            {:else}
              <li class="text-xs text-muted-foreground">{t(messages.nothingRuns)}</li>
            {/each}
          </ul>
        </div>
        <div class="flex flex-col gap-2">
          {@render section(t(messages.waitingSection(live.waiting.length)), t(messages.waits))}
          <ul class="flex flex-col gap-2">
            {#each waiting as row (row.jobId)}
              <li class="flex h-6 min-w-0 items-center gap-1.5">
                <ChartDot tone="queued" />
                <span class="truncate text-sm font-medium">{row.pipelineName}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{row.projectName}</span>
                <span class="truncate text-xs text-muted-foreground">
                  {t(row.reason === 'approval' ? messages.waitsForApproval : messages.waitsForAgent)}
                </span>
                <span class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">{row.waited}</span>
                <LiveWaitingActions {row} />
              </li>
            {:else}
              <li class="text-xs text-muted-foreground">{t(messages.nothingWaits)}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </WidgetBody>
</Widget>
