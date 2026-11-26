<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';
  import { enter } from '../../motion/enter.ts';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    title: string;
    /** The icon of the item, above the title. */
    icon: Snippet;
    /** The state of the item under the title, e.g. its failures: a grid of tiles is an overview. */
    status?: Snippet;
    /** A control in the top right corner: a menu. */
    actions?: Snippet;
    selected?: boolean;
    /** A click on the tile opens the item: a pointer cursor and a press. */
    interactive?: boolean;
  };

  let {
    title,
    icon,
    status,
    actions,
    selected = false,
    interactive = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<!-- A small square: the icon, the name and the state, centered on both axes. -->
<div
  in:enter
  data-slot="tile"
  data-selected={selected || undefined}
  class={cn(
    'group relative flex h-full min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-3 text-center text-card-foreground transition-all duration-200 hover:border-primary/50 hover:shadow-md motion-reduce:transition-none',
    interactive && 'cursor-pointer active:scale-[0.98]',
    selected && 'border-primary ring-2 ring-primary',
    className,
  )}
  {...rest}
>
  {#if actions}
    <div class="absolute top-1 right-1 flex items-center justify-center">{@render actions()}</div>
  {/if}
  <span class="flex shrink-0 items-center justify-center">{@render icon()}</span>
  <span class="w-full truncate px-4 text-sm font-medium" {title}>{title}</span>
  {#if status}
    <div class="flex min-h-5 max-w-full items-center justify-center">{@render status()}</div>
  {/if}
</div>
