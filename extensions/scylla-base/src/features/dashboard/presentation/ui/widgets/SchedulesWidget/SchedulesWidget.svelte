<script lang="ts">
  import type { Snippet } from 'svelte';
  import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
  import PlayIcon from '@lucide/svelte/icons/play';
  import { Permission, can } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { ChartDot, ChartLegendItem, Widget, type ChartTone, type LucideIcon, type WidgetSize } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { triggerMutations } from '@base/features/triggers';
  import { scheduleMessages as messages } from '@base/features/dashboard/presentation/messages/schedules.messages.ts';
  import type { FireState, ScheduleFire, ScheduleTrigger } from '@base/features/dashboard/domain/structs/schedule.struct.ts';
  import { shortJobId, statusTone } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { attentionMessages } from '@base/features/dashboard/presentation/messages/attention.messages.ts';
  import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import type { DashboardWidgets } from '../dashboard-widgets.state.svelte.ts';
  import { viewPermissionName } from '@base/features/dashboard/presentation/presenters/permission-name.presenter.ts';
  import WidgetBody from '../parts/WidgetBody.svelte';

  interface Props {
    widgets: DashboardWidgets;
    size?: WidgetSize;
    timeZone?: string;
    /** The controls of the edit mode, over the card. */
    editing?: Snippet;
    now?: () => number;
  }

  let { widgets, size = 'm', timeZone = 'UTC', editing, now = Date.now }: Props = $props();

  const DAY_MS = 24 * 60 * 60 * 1000;
  const ROWS = 4;
  const FIRE_ROWS = 5;
  const TONES: Readonly<Record<FireState, ChartTone>> = { ok: 'passed', error: 'warning', missed: 'skipped', none: 'muted' };

  const data = $derived(widgets.schedules.data);
  const triggers = $derived(data?.triggers ?? []);
  const fires = $derived((data?.fires ?? []).slice(0, FIRE_ROWS));
  const start = $derived(now());
  const failed = $derived(triggers.reduce((sum, item) => sum + item.failedFires, 0));
  const missed = $derived(triggers.reduce((sum, item) => sum + item.missedTimes, 0));
  const problems = $derived(failed + missed);
  const nextFires = $derived(
    triggers
      .flatMap(trigger => trigger.upcoming.map(at => ({ trigger, at })))
      .sort((a, b) => a.at.localeCompare(b.at)),
  );
  const nextByTrigger = $derived(
    triggers
      .filter(trigger => trigger.upcoming.length > 0)
      .map(trigger => ({ trigger, at: trigger.upcoming[0] }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  );
  const firstProblem = $derived(triggers.find(item => item.lastState === 'error' || item.lastState === 'missed'));
  const names = $derived(new Map(triggers.map(item => [item.id, item.pipelineName])));
  const since = $derived(widgets.since ? clockIn(new Date(widgets.since), timeZone) : clockIn(new Date(start - DAY_MS), timeZone));
  const axis = $derived([0, 6, 12, 18, 24].map(hours => (hours === 0 ? t(messages.now) : clockIn(new Date(start + hours * 3_600_000), timeZone))));

  const fireNow = createMutation(() => triggerMutations.fireNow(firstProblem?.pipelineId ?? ''));

  const until = (at: string): string => {
    const minutes = Math.max(0, Math.round((Date.parse(at) - start) / 60_000));
    if (minutes < 60) return t(attentionMessages.minutes(minutes));
    const rest = minutes % 60;
    const hours = Math.floor(minutes / 60);
    return rest ? t(attentionMessages.hoursMinutes(hours, rest)) : t(attentionMessages.hours(hours));
  };
  const left = (at: string) => Math.min(100, Math.max(0, ((Date.parse(at) - start) / DAY_MS) * 100));
  const fireName = (fire: ScheduleFire) => names.get(fire.triggerId) ?? widgets.pipelines.get(fire.pipelineId)?.name ?? fire.triggerName;
  const verb = (fire: ScheduleFire) =>
    t(fire.state === 'error' ? messages.fireFailed : fire.state === 'missed' ? messages.timeMissed : messages.fired);
  const jobStatusText = (fire: ScheduleFire) =>
    fire.jobStatus === 'completed'
      ? t(widgetMessages.oneCompleted)
      : fire.jobStatus === 'failed'
        ? t(widgetMessages.oneFailed)
        : fire.jobStatus;
  const fireTone = (fire: ScheduleFire): ChartTone => (fire.state === 'ok' ? 'passed' : TONES[fire.state]);

  const onFire = (trigger: ScheduleTrigger) => {
    contextStore.getState().setProject(trigger.projectId, trigger.projectName);
    fireNow.mutate(trigger.id);
  };
</script>

{#snippet aside()}
  {#if problems > 0}
    <span class="font-medium text-status-failed">{problems === 1 ? t(messages.oneProblem) : t(messages.problems(problems))}</span>
  {/if}
{/snippet}

{#snippet legend()}
  {#if problems > 0}
    <div class="flex items-center gap-3">
      {#if failed > 0}<ChartLegendItem tone="warning" label={t(messages.fireFailed)} value={failed} />{/if}
      {#if missed > 0}<ChartLegendItem tone="skipped" label={t(messages.timeMissed)} value={missed} />{/if}
    </div>
  {/if}
{/snippet}

{#snippet timeline()}
  <div class="grid grid-cols-[136px_minmax(0,1fr)] items-center gap-y-2">
    <span></span>
    <div class="flex justify-between text-xs text-muted-foreground tabular-nums">
      {#each axis as label, index (index)}<span>{label}</span>{/each}
    </div>
    {#each triggers.slice(0, ROWS) as trigger (trigger.id)}
      <span class="flex min-w-0 items-center gap-2 pr-2">
        <ChartDot tone={TONES[trigger.lastState]} />
        <span class="truncate text-sm font-medium">{trigger.pipelineName}</span>
      </span>
      <span class="relative h-5" aria-hidden="true">
        <span class="absolute inset-x-0 top-1/2 h-px bg-border"></span>
        {#each trigger.upcoming as at (at)}
          <span class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style="left: {left(at)}%"><ChartDot tone="passed" /></span>
        {/each}
      </span>
    {/each}
  </div>
{/snippet}

<Widget
  {size}
  {editing}
  title={size === 'xs' ? t(messages.nextFire) : t(messages.title)}
  icon={CalendarClockIcon as LucideIcon}
  meta={size === 'xs' ? undefined : t(messages.next24h)}
  {aside}
>
  <WidgetBody
    {size}
    retrySeconds={30}
    permission={viewPermissionName('triggers')}
    locked={widgets.schedulesLocked}
    loading={widgets.schedules.isPending && !widgets.schedulesLocked}
    error={widgets.schedules.isError && !widgets.schedulesLocked}
    onRetry={() => void widgets.schedules.refetch()}
    empty={!!data && triggers.length === 0}
    emptyTitle={t(messages.noSchedule)}
    emptyText={t(messages.noScheduleText)}
  >
    {#if size === 'xs'}
      {@const next = nextFires[0]}
      <p data-part="schedules" class="flex h-7 min-w-0 items-center gap-2">
        {#if next}
          <span class="font-display text-xl font-medium tabular-nums">{until(next.at)}</span>
          <span class="truncate text-xs text-muted-foreground">{next.trigger.pipelineName}</span>
        {/if}
      </p>
    {:else if size === 's'}
      <div data-part="schedules" class="flex min-h-0 flex-1 flex-col gap-2">
        <ul class="flex flex-col gap-1.5">
          {#each nextByTrigger.slice(0, ROWS) as fire (fire.trigger.id)}
            <li class="flex h-5 min-w-0 items-center gap-3">
              <span class="shrink-0 font-mono text-xs tabular-nums">{clockIn(new Date(fire.at), timeZone)}</span>
              <span class="truncate text-sm font-medium">{fire.trigger.pipelineName}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{t(messages.inTime(until(fire.at)))}</span>
            </li>
          {/each}
        </ul>
        <div class="mt-auto">{@render legend()}</div>
      </div>
    {:else if size === 'm'}
      <div data-part="schedules">{@render timeline()}</div>
    {:else}
      <div data-part="schedules" class="flex min-h-0 flex-1 flex-col gap-4">
        {@render timeline()}
        {#if fires.length > 0}
          <div class="flex flex-col gap-1.5">
            <p class="flex items-center text-xs text-muted-foreground">
              <span>{t(messages.lastFires)}</span>
              <span class="ml-auto">{t(messages.since(since))}</span>
            </p>
            <ul class="flex flex-col gap-1">
              {#each fires as fire (fire.id)}
                <li class="flex h-6 min-w-0 items-center gap-2 text-xs">
                  <span class="w-10 shrink-0 font-mono tabular-nums text-muted-foreground">{clockIn(new Date(fire.at), timeZone)}</span>
                  <ChartDot tone={fireTone(fire)} />
                  <span class="shrink-0 text-sm font-medium">{fireName(fire)}</span>
                  <span class="shrink-0 font-medium">{verb(fire)}</span>
                  {#if fire.jobId}
                    <span class="shrink-0 font-mono text-muted-foreground">{shortJobId(fire.jobId)}</span>
                    <span class={statusTone(fire.jobStatus) === 'failed' ? 'truncate text-status-failed' : 'truncate text-muted-foreground'}>
                      {jobStatusText(fire)}
                    </span>
                  {:else}
                    <span class="truncate text-muted-foreground">{fire.error}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        <div class="mt-auto flex items-center gap-3">
          {@render legend()}
          {#if firstProblem && can(Permission.MANAGE_TRIGGERS)}
            <Button variant="outline" size="xs" class="ml-auto" disabled={fireNow.isPending} onclick={() => onFire(firstProblem)}>
              <PlayIcon aria-hidden="true" />
              {t(messages.fireNow(firstProblem.pipelineName))}
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  </WidgetBody>
</Widget>
