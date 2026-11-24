<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';

  interface Props {
    class?: string;
    style?: string;
    /** The top of the bar, in percent of the height of the trigger. Not set: the trigger itself. */
    top?: number;
    children: Snippet;
    tip: Snippet;
  }

  let { class: className = '', style, top, children, tip }: Props = $props();

  let anchor = $state<HTMLElement | null>(null);
</script>

<Tooltip delayDuration={50}>
  <TooltipTrigger>
    {#snippet child({ props })}
      <div {...props} class="relative {className} transition-opacity hover:opacity-75" {style}>
        {@render children()}
        {#if top !== undefined}
          <span
            bind:this={anchor}
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 h-0"
            style="bottom: {Math.min(100, Math.max(0, top))}%"
          ></span>
        {/if}
      </div>
    {/snippet}
  </TooltipTrigger>
  <TooltipContent
    side="top"
    sideOffset={4}
    customAnchor={top !== undefined ? anchor : null}
    class="border-border bg-popover p-2 text-xs text-popover-foreground shadow-lg"
  >
    <div class="flex flex-col gap-0.5 tabular-nums">
      {@render tip()}
    </div>
  </TooltipContent>
</Tooltip>
