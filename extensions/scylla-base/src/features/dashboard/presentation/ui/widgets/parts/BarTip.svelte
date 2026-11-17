<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';

  interface Props {
    class?: string;
    style?: string;
    children: Snippet;
    tip: Snippet;
  }

  let { class: className = '', style, children, tip }: Props = $props();
</script>

<Tooltip delayDuration={50}>
  <TooltipTrigger>
    {#snippet child({ props })}
      <div {...props} class="{className} transition-opacity hover:opacity-75" {style}>
        {@render children()}
      </div>
    {/snippet}
  </TooltipTrigger>
  <TooltipContent side="top" class="border-border bg-popover p-2 text-xs text-popover-foreground shadow-lg">
    <div class="flex flex-col gap-0.5 tabular-nums">
      {@render tip()}
    </div>
  </TooltipContent>
</Tooltip>
