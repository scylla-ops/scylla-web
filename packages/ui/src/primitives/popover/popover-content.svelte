<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Popover as PopoverPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  type Props = PopoverPrimitive.ContentProps & { children?: Snippet };

  let {
    class: className,
    sideOffset = 4,
    align = 'center',
    children,
    ...rest
  }: Props = $props();
</script>

<PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
    data-slot="popover-content"
    {sideOffset}
    {align}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--bits-floating-transform-origin) rounded-xl border p-4 shadow-lg outline-hidden',
      className,
    )}
    {...rest}
  >
    {@render children?.()}
  </PopoverPrimitive.Content>
</PopoverPrimitive.Portal>
