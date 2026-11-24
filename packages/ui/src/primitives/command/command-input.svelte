<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';

  let {
    value = $bindable(''),
    ref = $bindable(null),
    class: className,
    autofocus,
    ...rest
  }: CommandPrimitive.InputProps = $props();
</script>

<CommandPrimitive.Input
  bind:value
  bind:ref
  data-slot="command-input"
  class={cn(
    'h-11 w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground',
    className,
  )}
  {...rest}
>
  {#snippet child({ props })}
    <!-- svelte-ignore a11y_autofocus -->
    <input {...props} {autofocus} bind:value />
  {/snippet}
</CommandPrimitive.Input>
