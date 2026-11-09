<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { JobOutcomes } from '@base/features/apps/domain/structs/agent-stats.struct.ts';
  import { JOB_SERIES } from './job-series.registry.ts';

  interface Props {
    outcomes: JobOutcomes;
    /** In percent of the height of the chart. */
    height: number;
    class?: string;
  }

  let { outcomes, height, class: className }: Props = $props();
</script>

<span class={cn('relative flex flex-col-reverse overflow-hidden', className)} style:height="{height}%">
  {#each JOB_SERIES as series (series.key)}
    {#if outcomes[series.key] > 0}
      <span class={series.color} style:flex-grow={outcomes[series.key]}></span>
    {/if}
  {/each}
</span>
