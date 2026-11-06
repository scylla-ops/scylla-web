<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  let { class: className, ...rest }: CommandPrimitive.ItemProps = $props();
</script>

<CommandPrimitive.Item
  data-slot="command-item"
  class={cn(
    'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:opacity-60 data-[selected]:bg-accent data-[selected]:text-accent-foreground',
    className,
  )}
  {...rest}
/>
