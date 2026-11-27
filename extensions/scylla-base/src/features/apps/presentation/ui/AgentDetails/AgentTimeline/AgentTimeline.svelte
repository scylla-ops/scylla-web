<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatUtcDay } from '@shared/utils/date-utils.ts';
  import { endedJobs, type AgentStats } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import {
    daysBetween,
    periodDays,
    type Day,
    type StatsPeriod,
  } from '@base/features/apps/domain/structs/stats-period.struct.ts';
  import type { PeriodChoice } from '@base/features/apps/presentation/mappers/period-search.mapper.ts';
  import {
    daysForPixels,
    labelShift,
    spanOf,
    timelineStrip,
    windowBox,
  } from '@base/features/apps/presentation/presenters/agent-timeline.presenter.ts';
  import { periodRange } from '@base/features/apps/presentation/presenters/period-range.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { dragWindow } from './drag-window.attachments.ts';
  import { createTimelineWindow, type WindowPart } from './timeline-window.state.svelte.ts';
  import TimelineStrip from './TimelineStrip.svelte';

  interface Props {
    /** From the creation of the agent to today. */
    bounds: StatsPeriod;
    stats: AgentStats;
    period: StatsPeriod;
    today: Day;
    /** The day that the agent was disabled. */
    disabled: Day | null;
    onChoose: (choice: PeriodChoice) => void;
  }

  let { bounds, stats, period, today, disabled, onChoose }: Props = $props();

  let width = $state(0);
  const strip = $derived(timelineStrip({ bounds, days: stats.days, disabled, width }));
  const total = $derived(endedJobs(stats.outcomes));

  const timeline = createTimelineWindow(() => ({ period, bounds, onChange: onChoose }));
  const box = $derived(windowBox(spanOf(timeline.shown, bounds, strip.columns), width));
  const daysFor = (pixels: number) => daysForPixels(pixels, width, strip.columns);
</script>

{#snippet handle(part: WindowPart, day: Day)}
  <span
    role="slider"
    tabindex="0"
    aria-label={t(part === 'start' ? messages.periodStart(formatUtcDay(day)) : messages.periodEnd(formatUtcDay(day)))}
    aria-valuemin={0}
    aria-valuemax={periodDays(bounds) - 1}
    aria-valuenow={daysBetween(bounds.from, day)}
    aria-valuetext={formatUtcDay(day)}
    aria-orientation="horizontal"
    class={cn(
      'absolute top-1/2 z-20 flex h-[26px] w-2.5 -translate-y-1/2 cursor-ew-resize touch-none flex-col items-center justify-center gap-[3px] rounded-[5px] border-[1.5px] border-primary bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      part === 'start' ? '-left-[5px]' : '-right-[5px]',
    )}
    {@attach dragWindow(part, timeline, daysFor)}
  >
    {#each [0, 1, 2] as grip (grip)}
      <span class="h-px w-1 bg-primary"></span>
    {/each}
  </span>
{/snippet}

<!-- The strip of the days since the agent joined, and the window of the period on it. The labels
     go under the box, in its bottom padding. -->
<div class="pb-6">
  <div class="relative h-[62px] select-none" bind:clientWidth={width}>
    <TimelineStrip
      {strip}
      {total}
      disabledLabel={disabled ? t(messages.disabledSince(formatUtcDay(disabled))) : ''}
    />
    <div class="absolute inset-y-0 left-0 bg-card/60" style:width="{box.left * 100}%"></div>
    <div
      class="absolute inset-y-0 right-0 bg-card/60"
      style:width="{(1 - box.left - box.width) * 100}%"
    ></div>
    <div
      class="absolute inset-y-0 cursor-grab touch-none rounded-md border-[1.5px] border-primary bg-primary/7 active:cursor-grabbing"
      style:left="{box.left * 100}%"
      style:width="{box.width * 100}%"
      data-part="timeline-window"
      {@attach dragWindow('move', timeline, daysFor)}
    >
      {#if timeline.dragging}
        <span
          class="absolute -top-8 left-1/2 z-30 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background"
          style:translate={labelShift(box, width)}
          role="status"
        >
          {t(messages.periodDays(periodRange(timeline.shown, today), periodDays(timeline.shown)))}
        </span>
      {/if}
      {@render handle('start', timeline.shown.from)}
      {@render handle('end', timeline.shown.to)}
    </div>
  </div>
</div>
