<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';
  import { enter } from '../../motion/enter.ts';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    title: string;
    /** The icon of the item, before the title. */
    icon: Snippet;
    /** A short fact after the title, e.g. a count of failures. */
    badge?: Snippet;
    /** A detail after the title on a wide screen, under it when `stacked`. */
    subtitle?: Snippet;
    /** A detail at the end of the row, e.g. the time of the last run. Under the title when `stacked`. */
    meta?: Snippet;
    /** The controls at the end of the row: a menu, a checkbox. */
    actions?: Snippet;
    /** A phone: the details go on a second line, and the row is taller for a finger. */
    stacked?: boolean;
    selected?: boolean;
    /** A click on the row opens the item: a pointer cursor. */
    interactive?: boolean;
  };

  let {
    title,
    icon,
    badge,
    subtitle,
    meta,
    actions,
    stacked = false,
    selected = false,
    interactive = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<!-- One item on one line: many items fit on a screen. A row that comes after the first render fades in. -->
<div
  in:enter
  data-slot="list-row"
  data-selected={selected || undefined}
  data-stacked={stacked || undefined}
  class={cn(
    'group flex w-full items-center gap-3 rounded-lg border bg-card px-3 text-card-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-accent/40 motion-reduce:transition-none',
    stacked ? 'min-h-14 py-2' : 'h-12',
    interactive && 'cursor-pointer',
    selected && 'border-primary ring-2 ring-primary',
    className,
  )}
  {...rest}
>
  <span class="flex shrink-0 items-center justify-center">{@render icon()}</span>
  {#if stacked}
    <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
      <div class="flex min-w-0 items-center gap-2">
        <span class="min-w-0 truncate text-sm font-medium" {title}>{title}</span>
        {@render badge?.()}
      </div>
      {#if subtitle || meta}
        <div class="flex min-w-0 items-center gap-3 overflow-hidden">
          {@render subtitle?.()}
          {@render meta?.()}
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <span class="min-w-0 shrink truncate text-sm font-medium" {title}>{title}</span>
      {@render badge?.()}
      {#if subtitle}
        <div class="flex min-w-0 shrink-[2] items-center overflow-hidden">{@render subtitle()}</div>
      {/if}
    </div>
    {#if meta}
      <div class="flex max-w-64 min-w-0 shrink-0 items-center justify-end">{@render meta()}</div>
    {/if}
  {/if}
  {#if actions}
    <div class="flex shrink-0 items-center justify-center gap-2">{@render actions()}</div>
  {/if}
</div>
