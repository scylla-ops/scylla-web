<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatUtcDay } from '@shared/utils/date-utils.ts';
  import type { TimelineStrip } from '@base/features/apps/presentation/presenters/agent-timeline.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import HatchedZone from '../HatchedZone.svelte';
  import StackedBar from '../StackedBar.svelte';

  interface Props {
    strip: TimelineStrip;
    total: number;
    /** The pill of the days after the agent was disabled. */
    disabledLabel: string;
  }

  let { strip, total, disabledLabel }: Props = $props();

  const count = $derived(strip.days.length);
  const first = $derived(strip.columns - count);
  const percent = (part: number) => `${part * 100}%`;
</script>

<!--
  Absolute layers in the box of the timeline. The days are the last columns. The incidents have a
  z-index, so they stay above the dim parts outside the window. The labels go under the box: the
  first day and "Today" are in one row as wide as the days, which grows to the left when they need
  more room.
-->
<div
  class={cn(
    'absolute inset-x-0 top-3 bottom-1 grid items-end',
    count > 120 && first === 0 ? 'gap-px' : 'gap-0.5',
  )}
  style:grid-template-columns="repeat({strip.columns}, minmax(0, 1fr))"
  role="img"
  aria-label={t(messages.timelineLabel(total))}
>
  {#if first > 0}
    <span style:grid-column="span {first}"></span>
  {/if}
  {#each strip.days as day (day.day)}
    {#if day.total === 0}
      <span class="h-0.5 rounded-[1px] bg-muted-foreground/45"></span>
    {:else}
      <StackedBar
        outcomes={day.outcomes}
        height={(day.total / strip.peak) * 100}
        class="rounded-t-[1.5px]"
      />
    {/if}
  {/each}
</div>
<div class="absolute inset-x-0 bottom-1 border-t border-input"></div>
{#if strip.disabled}
  <HatchedZone
    class="absolute top-0 bottom-1 rounded-sm"
    style="left: {percent(strip.disabled.left)}; width: {percent(strip.disabled.width)}"
    label={disabledLabel}
  />
{/if}
{#each strip.days as day, index (day.day)}
  {#if day.incident}
    <span
      class="absolute top-0.5 z-10 size-1.5 -translate-x-1/2 rounded-full bg-destructive"
      style:left={percent((first + index + 0.5) / strip.columns)}
      aria-hidden="true"
    ></span>
  {/if}
{/each}
<div class="absolute inset-x-0 top-full mt-1.5 h-4 text-xs text-muted-foreground" aria-hidden="true">
  {#each strip.months as mark (mark.day)}
    <span class="absolute top-0 whitespace-nowrap" style:left={percent(mark.at)}>
      {formatUtcDay(mark.day, 'month')}
    </span>
  {/each}
  <div
    class="absolute top-0 right-0 flex gap-2 whitespace-nowrap"
    style:min-width={percent(count / strip.columns)}
  >
    {#if strip.start}
      <span>{formatUtcDay(strip.start, 'day')}</span>
    {/if}
    <span class="ml-auto">{t(messages.today)}</span>
  </div>
</div>
