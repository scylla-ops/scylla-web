<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  let {
    value = $bindable(''),
    ref = $bindable(null),
    class: className,
    ...rest
  }: CommandPrimitive.RootProps = $props();
</script>

<CommandPrimitive.Root
  bind:value
  bind:ref
  data-slot="command"
  class={cn('flex min-h-0 flex-col', className)}
  {...rest}
/>
