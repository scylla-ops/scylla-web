<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';

  interface Props {
    class?: string;
    style?: string;
    /** The top of the bar, in percent of the height of the trigger. Not set: the trigger itself. */
    top?: number;
    /** The page that a click on the bar opens. Not set: the bar only shows its tooltip. */
    href?: string | null;
    /** What a click opens, under the tooltip. */
    hint?: string;
    children: Snippet;
    tip: Snippet;
  }

  let { class: className = '', style, top, href, hint, children, tip }: Props = $props();

  let anchor = $state<HTMLElement | null>(null);
</script>

{#snippet bar()}
  {@render children()}
  {#if top !== undefined}
    <span
      bind:this={anchor}
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 h-0"
      style="bottom: {Math.min(100, Math.max(0, top))}%"
    ></span>
  {/if}
{/snippet}

<Tooltip delayDuration={50}>
  <TooltipTrigger>
    {#snippet child({ props })}
      {#if href}
        <a
          {...props}
          {href}
          aria-label={hint}
          class="relative {className} transition-opacity outline-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring/60"
          {style}
        >
          {@render bar()}
        </a>
      {:else}
        <div {...props} class="relative {className} transition-opacity hover:opacity-75" {style}>
          {@render bar()}
        </div>
      {/if}
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
      {#if href && hint}
        <span class="mt-1 border-t border-border pt-1 text-muted-foreground">{hint}</span>
      {/if}
    </div>
  </TooltipContent>
</Tooltip>
