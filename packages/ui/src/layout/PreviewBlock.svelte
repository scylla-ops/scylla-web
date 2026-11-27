<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils/index.ts';

  interface Props {
    /** The name of the group, over the preview. */
    label: string;
    /** The large preview, 72 px: `EntityIcon size={72}`, an avatar of 72 px. */
    preview: Snippet;
    /** The actions under the preview: buttons of the size `sm`. */
    actions?: Snippet;
    class?: string;
    [dataAttribute: `data-${string}`]: unknown;
  }

  let { label, preview, actions, class: className, ...rest }: Props = $props();

  const id = $props.id();
</script>

<!-- One centered column, as the card of a person: the label, the preview, the actions. -->
<div
  {...rest}
  role="group"
  aria-labelledby="{id}-label"
  class={cn('flex flex-col items-center gap-3 text-center', className)}
>
  <span id="{id}-label" class="text-sm leading-snug font-medium">{label}</span>
  {@render preview()}
  {#if actions}
    <div class="flex flex-wrap items-center justify-center gap-2">
      {@render actions()}
    </div>
  {/if}
</div>
