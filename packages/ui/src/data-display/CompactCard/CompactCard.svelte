<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';
  import Card from '../../primitives/card/card.svelte';
  import CardTitle from '../../primitives/card/card-title.svelte';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    title: string;
    /** The icon of the item, before the title. */
    icon: Snippet;
    /** A short fact after the title, e.g. a count of failures. */
    badge?: Snippet;
    /** One line under the title. */
    subtitle?: Snippet;
    /** The controls at the end of the first line: a menu, a checkbox. */
    actions?: Snippet;
    /** The bottom line of the card. */
    footer?: Snippet;
    selected?: boolean;
    /** A click on the card opens the item: a pointer cursor and a press. */
    interactive?: boolean;
  };

  let {
    title,
    icon,
    badge,
    subtitle,
    actions,
    footer,
    selected = false,
    interactive = false,
    class: className,
    ...rest
  }: Props = $props();
</script>

<!-- A smaller card: no description and no body, about two cards in the place of one. -->
<Card
  data-slot="compact-card"
  data-selected={selected || undefined}
  class={cn(
    'group flex h-full flex-col justify-between gap-2 p-3 transition-all duration-200 hover:border-primary/50 hover:shadow-md motion-reduce:transition-none',
    interactive && 'cursor-pointer active:scale-[0.98]',
    selected && 'border-primary ring-2 ring-primary',
    className,
  )}
  {...rest}
>
  <div class="flex items-center gap-2.5">
    <span class="flex shrink-0 items-center justify-center">{@render icon()}</span>
    <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
      <div class="flex min-w-0 items-center gap-2">
        <CardTitle class="min-w-0 truncate" {title}>{title}</CardTitle>
        {@render badge?.()}
      </div>
      {@render subtitle?.()}
    </div>
    {#if actions}
      <div class="flex shrink-0 items-center justify-center gap-2">{@render actions()}</div>
    {/if}
  </div>
  {@render footer?.()}
</Card>
