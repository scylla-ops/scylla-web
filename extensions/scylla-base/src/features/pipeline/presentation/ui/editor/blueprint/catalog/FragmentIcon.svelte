<script lang="ts">
  import LayersIcon from '@lucide/svelte/icons/layers';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    compact?: boolean;
    class?: string;
  }

  let { compact = false, class: className }: Props = $props();
</script>

<!-- The tile of a fragment of the library: the colour of a linked block. -->
<span
  class={cn(
    'flex shrink-0 items-center justify-center rounded-lg bg-info/12 text-info',
    compact ? 'size-6' : 'size-8',
    className,
  )}
>
  <LayersIcon class={compact ? 'size-3.5' : 'size-4'} />
</span>
