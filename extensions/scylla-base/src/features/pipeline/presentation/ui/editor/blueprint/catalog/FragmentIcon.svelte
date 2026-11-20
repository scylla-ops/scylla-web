<script lang="ts">
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import LayersIcon from '@lucide/svelte/icons/layers';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    compact?: boolean;
    /** A fork that the workspace owns: the colour of its own nodes. */
    forked?: boolean;
    class?: string;
  }

  let { compact = false, forked = false, class: className }: Props = $props();

  const Icon = $derived(forked ? GitForkIcon : LayersIcon);
</script>

<!-- The tile of a fragment of the library: the colour of a linked block. -->
<span
  class={cn(
    'flex shrink-0 items-center justify-center rounded-lg',
    forked ? 'bg-primary/12 text-primary' : 'bg-info/12 text-info',
    compact ? 'size-6' : 'size-8',
    className,
  )}
>
  <Icon class={compact ? 'size-3.5' : 'size-4'} />
</span>
