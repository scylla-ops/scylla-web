<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { WidgetKind } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

  interface Props {
    kind: WidgetKind;
    class?: string;
  }

  let { kind, class: className }: Props = $props();

  const BARS = [5, 8, 6, 9, 7, 10, 8];
</script>

<span
  aria-hidden="true"
  data-kind={kind}
  class={cn(
    'flex h-7 w-12 shrink-0 items-center gap-0.5 overflow-hidden rounded-md border border-border bg-background px-1 text-[7px] leading-none',
    className,
  )}
>
  {#if kind === 'sentence' || kind === 'list'}
    <span class="font-semibold text-status-failed">4</span>
    <span class="flex flex-1 flex-col gap-0.5">
      <span class="h-0.5 w-full rounded bg-foreground/50"></span>
      <span class="h-0.5 w-2/3 rounded bg-muted-foreground/40"></span>
    </span>
  {:else if kind === 'ratio'}
    <span class="size-3 rounded-full border-2 border-status-passed"></span>
    <span class="ml-auto font-semibold">89%</span>
  {:else if kind === 'bars' || kind === 'line'}
    <span class="font-semibold">164</span>
    <span class="ml-auto flex h-4 items-end gap-px">
      {#each BARS as bar, index (index)}
        <span class="w-0.5 bg-status-passed" style="height: {bar * 10}%"></span>
      {/each}
    </span>
  {:else if kind === 'capacity'}
    <span class="font-semibold">3/4</span>
    <span class="ml-auto flex gap-px">
      {#each [1, 1, 1, 0] as busy, index (index)}
        <span class="size-1.5 rounded-[1px] {busy ? 'bg-primary' : 'bg-muted'}"></span>
      {/each}
    </span>
  {:else if kind === 'health'}
    <span class="font-semibold">9/12</span>
    <span class="ml-auto h-0.5 w-4 rounded bg-status-passed"></span>
  {:else if kind === 'timeline' || kind === 'heatmap'}
    <span class="flex h-4 w-full items-end gap-px">
      {#each BARS.concat(BARS) as bar, index (index)}
        <span class="w-px flex-1 bg-status-passed/70" style="height: {bar * 10}%"></span>
      {/each}
    </span>
  {:else if kind === 'status-band'}
    <span class="flex gap-px">
      {#each [0, 1, 2] as index (index)}
        <span class="size-1 rounded-full bg-status-running"></span>
      {/each}
    </span>
    <span class="h-0.5 flex-1 rounded bg-foreground/40"></span>
  {:else}
    <span class="flex w-full flex-col gap-0.5">
      <span class="h-0.5 w-3/4 rounded bg-foreground/40"></span>
      <span class="h-0.5 w-full rounded bg-muted-foreground/30"></span>
      <span class="h-0.5 w-1/2 rounded bg-muted-foreground/30"></span>
    </span>
  {/if}
</span>
