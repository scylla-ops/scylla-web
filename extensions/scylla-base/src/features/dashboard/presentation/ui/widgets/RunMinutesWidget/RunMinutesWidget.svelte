<script lang="ts">
  import type { Snippet } from 'svelte';
  import HourglassIcon from '@lucide/svelte/icons/hourglass';
  import { ChartDot, ChartSegment, Widget, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { formatUtcDay } from '@shared/utils/date-utils.ts';
  import { minutesMessages as messages } from '@base/features/dashboard/presentation/messages/minutes.messages.ts';
  import { dayIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    size?: WidgetSize;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
    now?: () => number;
  }

  let { widgets, period, size = 'xs', editing, now = Date.now }: Props = $props();

  const PROJECT_ROWS: Readonly<Record<WidgetSize, number>> = { xs: 0, s: 0, m: 5, l: 4 };

  const timeZone = $derived(period.timeZone ?? 'UTC');
  const stats = $derived(widgets.monthMinutes.data);
  const used = $derived(Math.round((stats?.totals.runTime ?? 0) / 60));
  const today = $derived(dayIn(new Date(now()), timeZone));
  const daysInMonth = $derived(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate());
  const dayOfMonth = $derived(Number(today.slice(8, 10)));
  const daysLeft = $derived(daysInMonth - dayOfMonth);
  const pace = $derived(Math.round((used / Math.max(1, dayOfMonth)) * daysInMonth));
  const lastDay = $derived(`${today.slice(0, 8)}${String(daysInMonth).padStart(2, '0')}`);
  const month = $derived(formatUtcDay(`${today.slice(0, 8)}01`, 'month'));
  const days = $derived(
    Array.from({ length: daysInMonth }, (_, index) => {
      const bucket = stats?.buckets[index];
      return { day: index + 1, minutes: bucket ? bucket.figures.runTime / 60 : 0, future: index + 1 > dayOfMonth };
    }),
  );
  const busiestDay = $derived(Math.max(1, ...days.map(day => day.minutes)));
  const projects = $derived(
    (stats?.groups ?? [])
      .map(group => ({
        id: group.id,
        name: [...widgets.pipelines.values()].find(item => item.projectId === group.id)?.projectName ?? group.id.slice(-8),
        minutes: Math.round(group.figures.runTime / 60),
      }))
      .filter(row => row.minutes > 0),
  );
  const mostProject = $derived(Math.max(1, ...projects.map(row => row.minutes)));
  const number = (value: number) => value.toLocaleString();
</script>

{#snippet usedBlock(big: boolean)}
  <div class="flex flex-col gap-0.5">
    <span class={big ? 'font-display text-[28px] leading-9 font-medium tabular-nums' : 'font-display text-xl font-medium tabular-nums'}>
      {t(messages.minutes(number(used)))}
    </span>
    <span class="text-xs text-muted-foreground">{t(messages.thisMonth)}</span>
    <span class="text-xs text-muted-foreground">{t(messages.daysLeft(daysLeft))}</span>
  </div>
{/snippet}

{#snippet byProject(limit: number)}
  <div class="flex min-w-0 flex-col gap-1.5">
    <p class="flex items-center text-xs text-muted-foreground">
      <span>{t(messages.byProject)}</span>
      <span class="ml-auto">{t(messages.minutesColumn)}</span>
    </p>
    <ul class="flex flex-col gap-1">
      {#each projects.slice(0, limit) as row (row.id)}
        <li class="flex h-5 items-center gap-3">
          <span class="w-24 shrink-0 truncate text-sm font-medium">{row.name}</span>
          <span class="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <ChartSegment tone="passed" class="h-full rounded-full" style="width: {(row.minutes / mostProject) * 100}%" />
          </span>
          <span class="w-10 shrink-0 text-right text-xs font-medium tabular-nums">{number(row.minutes)}</span>
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

{#snippet aside()}
  <span>{month}</span>
{/snippet}

<Widget
  {size}
  {editing}
  title={t(messages.title)}
  icon={HourglassIcon as LucideIcon}
  meta={size === 'xs' ? undefined : month}
  aside={size === 'xs' ? aside : undefined}
>
  <WidgetBody
    {size}
    locked={!widgets.canReadJobs}
    loading={widgets.monthMinutes.isPending}
    error={widgets.monthMinutes.isError}
    onRetry={() => void widgets.monthMinutes.refetch()}
    empty={!!stats && used === 0}
    emptyTitle={t(messages.nothing)}
  >
    {#if size === 'xs'}
      <p data-part="run-minutes" class="flex h-7 items-center gap-1.5">
        <span class="font-display text-xl font-medium tabular-nums">{t(messages.minutes(number(used)))}</span>
        <span class="truncate text-xs text-muted-foreground">{t(messages.thisMonth)}</span>
      </p>
    {:else if size === 's'}
      <div data-part="run-minutes" class="flex min-h-0 flex-1 flex-col justify-between gap-2">
        {@render usedBlock(true)}
        <p class="flex items-center gap-2 text-xs text-muted-foreground">
          <ChartDot tone="muted" />
          <span class="truncate">{t(messages.paceShort(number(pace)))}</span>
        </p>
      </div>
    {:else if size === 'm'}
      <div data-part="run-minutes" class="flex min-h-0 flex-1 items-center gap-6">
        <div class="w-[200px] shrink-0">{@render usedBlock(true)}</div>
        <div class="min-w-0 flex-1">{@render byProject(PROJECT_ROWS.m)}</div>
      </div>
    {:else}
      <div data-part="run-minutes" class="flex min-h-0 flex-1 flex-col gap-3">
        {@render usedBlock(true)}
        <p class="flex items-center gap-2 text-xs text-muted-foreground">
          <ChartDot tone="muted" />
          <span class="truncate">{t(messages.pace(number(pace), formatUtcDay(lastDay)))}</span>
        </p>
        <div class="flex flex-col gap-1">
          <div class="flex h-[88px] items-end gap-1" role="img" aria-label={t(messages.thisMonth)}>
            {#each days as day (day.day)}
              {#if day.future}
                <span class="min-w-0 flex-1 border-b border-dashed border-border"></span>
              {:else}
                <ChartSegment tone="passed" class="min-w-0 flex-1 rounded-[2px]" style="height: {Math.max(3, (day.minutes / busiestDay) * 100)}%" />
              {/if}
            {/each}
          </div>
          <div class="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatUtcDay(`${today.slice(0, 8)}01`)}</span>
            <span>{formatUtcDay(`${today.slice(0, 8)}15`)}</span>
            <span>{formatUtcDay(lastDay)}</span>
          </div>
        </div>
        <div class="mt-auto">{@render byProject(PROJECT_ROWS.l)}</div>
      </div>
    {/if}
  </WidgetBody>
</Widget>
