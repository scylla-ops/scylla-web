<script lang="ts">
  import type { Snippet } from 'svelte';
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { cn } from '../../utils/index.ts';

  type Props = DropdownMenuPrimitive.SubTriggerProps & { inset?: boolean; children?: Snippet };

  let { class: className, inset, children, ...rest }: Props = $props();
</script>

<!-- The item that opens a submenu: the classes of `DropdownMenuItem`, and a chevron at the end. -->
<DropdownMenuPrimitive.SubTrigger
  data-slot="dropdown-menu-sub-trigger"
  data-inset={inset}
  class={cn(
    "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...rest}
>
  {@render children?.()}
  <ChevronRightIcon class="ml-auto" />
</DropdownMenuPrimitive.SubTrigger>
