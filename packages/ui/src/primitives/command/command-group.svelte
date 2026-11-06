<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  type Props = CommandPrimitive.GroupProps & { heading?: string; children?: Snippet };

  let { class: className, heading, children, ...rest }: Props = $props();
</script>

<CommandPrimitive.Group data-slot="command-group" class={cn('py-1', className)} {...rest}>
  {#if heading}
    <CommandPrimitive.GroupHeading class="px-2 py-1 text-xs font-medium text-muted-foreground">
      {heading}
    </CommandPrimitive.GroupHeading>
  {/if}
  <CommandPrimitive.GroupItems>
    {@render children?.()}
  </CommandPrimitive.GroupItems>
</CommandPrimitive.Group>
