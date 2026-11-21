<script lang="ts">
  import type { Snippet } from 'svelte';
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  type Props = DropdownMenuPrimitive.SubContentProps & { children?: Snippet };

  let { class: className, sideOffset = 4, children, ...rest }: Props = $props();
</script>

<!-- The panel of a submenu: the look of `DropdownMenuContent`, in the layer of its menu. -->
<DropdownMenuPrimitive.SubContent
  data-slot="dropdown-menu-sub-content"
  {sideOffset}
  class={cn(
    'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--bits-dropdown-menu-content-available-height) min-w-[8rem] origin-(--bits-floating-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border p-1 shadow-lg',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</DropdownMenuPrimitive.SubContent>
