<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  type Props = CommandPrimitive.ListProps & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<CommandPrimitive.List
  data-slot="command-list"
  class={cn('relative overflow-y-auto overscroll-contain', className)}
  {...rest}
>
  <CommandPrimitive.Viewport>
    {@render children?.()}
  </CommandPrimitive.Viewport>
</CommandPrimitive.List>
