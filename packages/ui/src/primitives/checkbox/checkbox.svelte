<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from 'bits-ui';
  import CheckIcon from '@lucide/svelte/icons/check';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import { cn } from '../../utils/index.ts';

  let { class: className, checked = $bindable(false), ...rest }: CheckboxPrimitive.RootProps =
    $props();
</script>

<CheckboxPrimitive.Root
  data-slot="checkbox"
  bind:checked
  class={cn(
    'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary',
    className,
  )}
  {...rest}
>
  <!--
    Radix had a separate `Indicator` that mounted only when checked; bits-ui
    hands the state to the children snippet instead, so the `{#if}` is what
    replaces it. `indeterminate` rides through `rest`: bits-ui then sets
    `aria-checked="mixed"`, and the box shows a dash.
  -->
  {#snippet children({ checked: isChecked, indeterminate })}
    <span
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      {#if indeterminate}
        <MinusIcon class="size-3.5" />
      {:else if isChecked}
        <CheckIcon class="size-3.5" />
      {/if}
    </span>
  {/snippet}
</CheckboxPrimitive.Root>
