<script lang="ts">
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatUtcDay } from '@shared/utils/date-utils.ts';
  import type { Day } from '@base/features/apps/domain/structs/stats-period.struct.ts';
  import type {
    ChartBar,
    JobsChart,
  } from '@base/features/apps/presentation/presenters/jobs-chart.presenter.ts';
  import type { LabelledZone } from '@base/features/apps/presentation/presenters/jobs-card.presenter.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { JOB_SERIES } from '../job-series.registry.ts';
  import HatchedZone from '../HatchedZone.svelte';
  import StackedBar from '../StackedBar.svelte';

  interface Props {
    chart: JobsChart;
    /** Bars with no job by design. */
    zones: LabelledZone[];
    today: Day;
    label: string;
  }

  let { chart, zones, today, label }: Props = $props();

  const count = $derived(chart.bars.length);
  const gap = $derived(count <= 31 ? 'gap-1' : count <= 60 ? 'gap-0.5' : 'gap-px');
  const hidden = $derived(
    new Set(zones.flatMap(zone => Array.from({ length: zone.end - zone.start }, (_, i) => zone.start + i))),
  );
  const at = (index: number) => `${(index / count) * 100}%`;

  const dateOf = (bar: ChartBar) =>
    chart.unit === 'week'
      ? t(messages.weekOf(formatUtcDay(bar.from)))
      : formatUtcDay(bar.from, 'weekday');
  const labelOf = (index: number) =>
    index === count - 1 && chart.bars[index].to === today
      ? t(messages.today)
      : formatUtcDay(chart.bars[index].from);
</script>

{#snippet barTooltip(bar: ChartBar)}
  <div class="flex items-baseline justify-between gap-3 pb-1.5">
    <span class="font-medium">{dateOf(bar)}</span>
    <span class="text-muted-foreground">{t(messages.jobCount(bar.total))}</span>
  </div>
  <ul class="flex flex-col gap-1">
    {#each JOB_SERIES as series (series.key)}
      {#if bar.outcomes[series.key] > 0}
        <li class="flex items-center gap-2">
          <span class="size-2 rounded-full {series.color}" aria-hidden="true"></span>
          <span class="flex-1">{t(series.label)}</span>
          <span class="text-muted-foreground tabular-nums">{bar.outcomes[series.key]}</span>
        </li>
      {/if}
    {/each}
  </ul>
{/snippet}

<!-- The scale has a dashed line at its top and its middle, and a solid base. -->
<div class="flex min-h-40 flex-1 flex-col gap-2" role="img" aria-label={label}>
  <div class="flex flex-1 gap-2">
    <div class="relative w-7 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
      <span class="absolute top-0 right-0 -translate-y-1/2">{chart.max}</span>
      <span class="absolute top-1/2 right-0 -translate-y-1/2">{chart.max / 2}</span>
      <span class="absolute right-0 bottom-0 translate-y-1/2">0</span>
    </div>
    <div class="relative flex-1">
      <div class="absolute inset-x-0 top-0 border-t border-dashed border-border"></div>
      <div class="absolute inset-x-0 top-1/2 border-t border-dashed border-border"></div>
      <div class="absolute inset-x-0 bottom-0 border-t border-input"></div>
      <div class="absolute inset-0 flex {gap}">
        {#each chart.bars as bar, index (bar.from)}
          {#if hidden.has(index)}
            <div class="flex-1"></div>
          {:else}
            <Tooltip>
              <TooltipTrigger>
                {#snippet child({ props })}
                  <div
                    {...props}
                    tabindex="-1"
                    class="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <span class="absolute inset-y-0 -inset-x-0.5 rounded-md group-hover:bg-muted"></span>
                    {#if bar.total === 0}
                      <span class="relative h-[3px] rounded-[1.5px] bg-muted-foreground/45"></span>
                    {:else}
                      <StackedBar
                        outcomes={bar.outcomes}
                        height={(bar.total / chart.max) * 100}
                        class="rounded-t-[3px]"
                      />
                    {/if}
                  </div>
                {/snippet}
              </TooltipTrigger>
              <TooltipContent
                side="top"
                arrow={false}
                class="w-[196px] rounded-[10px] border bg-card px-3 py-2.5 text-card-foreground shadow-md"
              >
                {@render barTooltip(bar)}
              </TooltipContent>
            </Tooltip>
          {/if}
        {/each}
      </div>
      {#each zones as zone (zone.start)}
        <HatchedZone
          class="absolute inset-y-0 rounded-sm"
          style="left: {at(zone.start)}; width: {((zone.end - zone.start) / count) * 100}%"
          label={zone.label}
        />
      {/each}
    </div>
  </div>
  <div class="relative ml-9 h-4 text-xs text-muted-foreground">
    {#each chart.labels as index (index)}
      <span
        class={cn('absolute top-0 whitespace-nowrap', index === count - 1 && index > 0 && 'right-0')}
        style:left={index === count - 1 && index > 0 ? undefined : at(index)}
      >
        {labelOf(index)}
      </span>
    {/each}
  </div>
</div>
