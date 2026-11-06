<script lang="ts">
  import { Combobox as ComboboxPrimitive } from 'bits-ui';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import { cn } from '../../utils/index.ts';

  let { class: className, ...rest }: ComboboxPrimitive.TriggerProps = $props();
</script>

<!-- Not a tab stop: the keyboard opens the list from the input. -->
<ComboboxPrimitive.Trigger
  data-slot="combobox-trigger"
  tabindex={-1}
  class={cn(
    'absolute inset-y-0 right-0 flex w-8 items-center justify-center outline-none disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  {...rest}
>
  <ChevronDownIcon class="size-4 text-muted-foreground opacity-50" aria-hidden="true" />
</ComboboxPrimitive.Trigger>
