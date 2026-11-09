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
  const percent = (part: number) => `${part * 100}%`;
</script>

<!--
  Absolute layers in the box of the timeline. The incidents have a z-index, so they stay above the
  dim parts outside the window. The labels go under the box.
-->
<div
  class={cn(
    'absolute inset-x-0 top-3 bottom-1 grid items-end',
    count > 120 ? 'gap-px' : 'gap-0.5',
  )}
  style:grid-template-columns="repeat({count}, minmax(0, 1fr))"
  role="img"
  aria-label={t(messages.timelineLabel(total))}
>
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
      style:left={percent((index + 0.5) / count)}
      aria-hidden="true"
    ></span>
  {/if}
{/each}
<div class="absolute inset-x-0 top-full mt-1.5 h-4 text-xs text-muted-foreground" aria-hidden="true">
  {#each strip.marks as mark (mark.kind + mark.day)}
    <span
      class={cn('absolute top-0 whitespace-nowrap', mark.kind === 'today' && 'right-0')}
      style:left={mark.kind === 'today' ? undefined : percent(mark.at)}
    >
      {#if mark.kind === 'today'}
        {t(messages.today)}
      {:else}
        {formatUtcDay(mark.day, mark.kind === 'start' ? 'day' : 'month')}
      {/if}
    </span>
  {/each}
</div>
