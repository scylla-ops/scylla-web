<script lang="ts">
  import { ChartSegment, type ChartTone } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { loadFill, loadText } from '@base/features/dashboard/presentation/presenters/agent-widget.presenter.ts';

  interface Props {
    label: string;
    value: number | null;
    bars: readonly (number | null)[];
    tone: ChartTone;
    class?: string;
  }

  let { label, value, bars, tone, class: className }: Props = $props();
</script>

<div class={cn('flex min-h-0 min-w-0 flex-col gap-1.5', className)}>
  <p class="flex items-center text-xs text-muted-foreground">
    <span>{label}</span>
    <span class="ml-auto font-mono text-foreground tabular-nums">{loadText(value)}</span>
  </p>
  <div class="flex min-h-0 flex-1 items-end gap-[3px]" role="img" aria-label={label}>
    {#each bars as bar, index (index)}
      {@const fill = loadFill(bar)}
      <span
        class={cn(
          'flex h-full min-w-0 flex-1 flex-col justify-end overflow-hidden rounded-[2px]',
          fill === null ? 'border border-dashed border-border' : 'bg-muted/70',
        )}
      >
        {#if fill}<ChartSegment {tone} class="w-full rounded-[2px]" style="height: {fill}%" />{/if}
      </span>
    {/each}
  </div>
</div>
