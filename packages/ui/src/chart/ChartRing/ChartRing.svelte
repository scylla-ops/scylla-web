<script lang="ts">
  import { cn } from '../../utils/index.ts';
  import { CHART_TONE_STROKE } from '../chart-tone.ts';
  import { ringArcs, type ChartRingArc } from './chart-ring.ts';

  interface Props {
    /** At most 3. The rest of the circle is the muted track. */
    arcs: readonly ChartRingArc[];
    total: number;
    /** The accessible name: the value and what it measures. */
    label: string;
    /** The text in the middle. */
    value?: string;
    size?: 'lg' | 'sm';
    class?: string;
  }

  let { arcs, total, label, value, size = 'lg', class: className }: Props = $props();

  const stroke = $derived(size === 'lg' ? 9 : 10);
  const radius = $derived(50 - stroke / 2);
  const geometry = $derived(ringArcs(arcs, total));
</script>

<div
  role="img"
  aria-label={label}
  data-slot="chart-ring"
  data-size={size}
  class={cn('relative shrink-0', size === 'lg' ? 'size-24' : 'size-10', className)}
>
  <svg viewBox="0 0 100 100" class="size-full" aria-hidden="true">
    <circle cx="50" cy="50" r={radius} fill="none" stroke-width={stroke} class="stroke-muted" />
    {#each geometry as arc, index (index)}
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke-width={stroke}
        pathLength="100"
        stroke-dasharray="{arc.length} {100 - arc.length}"
        stroke-dashoffset={-arc.start}
        transform="rotate(-90 50 50)"
        class={CHART_TONE_STROKE[arc.tone]}
      />
    {/each}
  </svg>
  {#if value}
    <span
      aria-hidden="true"
      class={cn(
        'absolute inset-0 flex items-center justify-center font-medium tabular-nums',
        size === 'lg' ? 'text-xl' : 'text-[10px]',
      )}
    >
      {value}
    </span>
  {/if}
</div>
