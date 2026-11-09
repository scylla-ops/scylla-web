<script lang="ts">
  import { cn } from '@scylla/ui/utils';

  interface Props {
    /** A pill in the middle of the zone. */
    label?: string;
    class?: string;
    style?: string;
  }

  let { label, class: className, style }: Props = $props();
</script>

<!-- Days with no job by design: before the agent joined, or after it was disabled. -->
<div
  class={cn(
    'flex items-center justify-center overflow-hidden bg-muted/50 bg-[image:repeating-linear-gradient(-45deg,var(--input)_0_1px,transparent_1px_6px)]',
    className,
  )}
  {style}
>
  {#if label}
    <span
      class="rounded-full border bg-card px-2.5 py-[3px] text-xs whitespace-nowrap text-muted-foreground"
    >
      {label}
    </span>
  {/if}
</div>
