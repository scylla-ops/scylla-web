<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Combobox as ComboboxPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  type Props = ComboboxPrimitive.ContentProps & { children?: Snippet };

  let { class: className, align = 'start', children, ...rest }: Props = $props();
</script>

<ComboboxPrimitive.Portal>
  <ComboboxPrimitive.Content
    data-slot="combobox-content"
    {align}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[min(20rem,var(--bits-combobox-content-available-height))] min-w-[8rem] origin-(--bits-floating-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border shadow-lg',
      'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
      className,
    )}
    {...rest}
  >
    <ComboboxPrimitive.Viewport
      class="w-full min-w-[var(--bits-combobox-anchor-width)] scroll-my-1 p-1"
    >
      {@render children?.()}
    </ComboboxPrimitive.Viewport>
  </ComboboxPrimitive.Content>
</ComboboxPrimitive.Portal>
