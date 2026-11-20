<script lang="ts" generics="TItem extends StatusTrailItem">
  import type { Snippet } from 'svelte';
  import { Tooltip, TooltipContent, TooltipTrigger } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { isLinkLit, trailDotClass, type StatusTrailItem } from './status-trail.ts';

  interface Props {
    /** Oldest first: the last item is the current one, and is drawn a little bigger. */
    items: TItem[];
    /** The tooltip of every dot, with its item. Without it, no tooltips. */
    tooltip?: Snippet<[TItem]>;
    emptyLabel: string;
    class?: string;
  }

  let { items, tooltip, emptyLabel, class: className }: Props = $props();

  type TriggerProps = Record<string, unknown> & { onclick?: (event: MouseEvent) => void };

  const dotClass = (item: TItem, isLast: boolean) =>
    cn(
      'relative shrink-0 rounded-full transition-transform duration-150',
      isLast ? 'size-3' : 'size-2.5',
      trailDotClass(item.state),
      // A 10 px dot is a small target: the button reaches 6 px around it.
      item.onSelect &&
        'cursor-pointer outline-none after:absolute after:-inset-1.5 hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
    );
</script>

<!-- A row of dots linked by lines, one per item (the last runs of a pipeline). -->
{#snippet dot(item: TItem, isLast: boolean, trigger: TriggerProps = {})}
  {#if item.onSelect}
    <button
      type="button"
      aria-label={item.label}
      data-slot="status-trail-dot"
      data-state={item.state}
      data-item-id={item.id}
      {...trigger}
      onclick={event => {
        // Call the trigger's handler too: it closes the tooltip on click.
        trigger.onclick?.(event);
        event.stopPropagation();
        item.onSelect?.();
      }}
      class={dotClass(item, isLast)}
    ></button>
  {:else}
    <span
      role="img"
      aria-label={item.label}
      data-slot="status-trail-dot"
      data-state={item.state}
      data-item-id={item.id}
      {...trigger}
      class={dotClass(item, isLast)}
    ></span>
  {/if}
{/snippet}

{#if items.length === 0}
  <span class={cn('text-xs text-muted-foreground', className)}>{emptyLabel}</span>
{:else}
  <div class={cn('flex items-center', className)}>
    {#each items as item, index (item.id)}
      {@const isLast = index === items.length - 1}
      {#if index > 0}
        {@const lit = isLinkLit(items[index - 1].state)}
        <span
          aria-hidden="true"
          data-slot="status-trail-link"
          data-lit={lit}
          class={cn('h-0.5 w-5 shrink-0 rounded-full', lit ? 'bg-status-passed' : 'bg-border')}
        ></span>
      {/if}
      {#if tooltip}
        <Tooltip delayDuration={100}>
          <TooltipTrigger>
            {#snippet child({ props })}
              {@render dot(item, isLast, props)}
            {/snippet}
          </TooltipTrigger>
          <TooltipContent side="top" class="border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
            {@render tooltip(item)}
          </TooltipContent>
        </Tooltip>
      {:else}
        {@render dot(item, isLast)}
      {/if}
    {/each}
  </div>
{/if}
