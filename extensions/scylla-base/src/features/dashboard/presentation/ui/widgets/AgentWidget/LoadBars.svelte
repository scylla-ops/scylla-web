<script lang="ts">
  import { ChartSegment, type ChartTone } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    label: string;
    value: number | null;
    bars: readonly (number | null)[];
    tone: ChartTone;
    class?: string;
  }

  let { label, value, bars, tone, class: className }: Props = $props();

  const top = $derived(Math.max(1, ...bars.map(bar => bar ?? 0)));
</script>

<div class={cn('flex min-h-0 min-w-0 flex-col gap-1.5', className)}>
  <p class="flex items-center text-xs text-muted-foreground">
    <span>{label}</span>
    <span class="ml-auto font-mono text-foreground tabular-nums">{value === null ? '—' : `${value} %`}</span>
  </p>
  <div class="flex min-h-0 flex-1 items-end gap-[3px]" role="img" aria-label={label}>
    {#each bars as bar, index (index)}
      <ChartSegment
        tone={bar === null ? 'muted' : tone}
        class="min-w-0 flex-1 rounded-[2px]"
        style="height: {Math.max(4, ((bar ?? 0) / top) * 100)}%"
      />
    {/each}
  </div>
</div>
