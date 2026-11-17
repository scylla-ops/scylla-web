<script lang="ts">
  import { cn } from '../utils/index.ts';
  import ChartDot from './ChartDot.svelte';
  import type { ChartTone } from './chart-tone.ts';

  interface Props {
    tone: ChartTone;
    label: string;
    value?: string | number;
    class?: string;
  }

  let { tone, label, value, class: className }: Props = $props();
</script>

<span
  data-slot="chart-legend-item"
  class={cn('inline-flex min-w-0 items-center gap-1.5 text-xs', className)}
>
  <ChartDot {tone} />
  <span class="truncate text-muted-foreground">{label}</span>
  {#if value !== undefined}
    <span class="font-medium tabular-nums">{value}</span>
  {/if}
</span>
