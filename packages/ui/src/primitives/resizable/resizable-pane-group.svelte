<script lang="ts">
  import { PaneGroup, type PaneGroupProps } from 'paneforge';
  import { cn } from '../../utils/index.ts';

  let { class: className, ...rest }: PaneGroupProps = $props();
</script>

<!--
  A pane animates its size (its flex-grow) when it collapses, expands or its group changes.
  While a pointer drags a handle, the panes follow the pointer with no transition, except a pane
  that collapses: it shrinks smoothly. A keyboard resize (data-active="keyboard") still animates.
-->
<PaneGroup
  data-slot="resizable-pane-group"
  class={cn(
    'flex h-full w-full data-[direction=vertical]:flex-col',
    '[&>[data-pane]]:transition-[flex-grow] [&>[data-pane]]:duration-200 [&>[data-pane]]:ease-out',
    'has-[>[data-pane-resizer][data-active=pointer]]:[&>[data-pane]:not([data-collapsed])]:transition-none',
    'motion-reduce:[&>[data-pane]]:transition-none',
    className,
  )}
  {...rest}
/>
