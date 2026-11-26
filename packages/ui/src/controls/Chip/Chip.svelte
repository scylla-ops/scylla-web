<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLButtonAttributes & {
    /** An icon before the text, e.g. the icon of an item. */
    icon?: Snippet;
    /** `more`: the chip of the items that do not show, e.g. "+3". */
    variant?: 'default' | 'more';
    children: Snippet;
  };

  let { icon, variant = 'default', children, class: className, ...rest }: Props = $props();
</script>

<!-- A small round button for one item of a short line, e.g. a folded group. -->
<button
  type="button"
  data-slot="chip"
  data-variant={variant}
  class={cn(
    'inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border bg-card text-xs font-medium transition-colors outline-none hover:border-primary/50 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none',
    icon ? 'max-w-48 pr-2.5 pl-1' : 'px-2.5',
    variant === 'more' && 'border-dashed text-muted-foreground tabular-nums',
    className,
  )}
  {...rest}
>
  {@render icon?.()}
  <span class="min-w-0 truncate">{@render children()}</span>
</button>
