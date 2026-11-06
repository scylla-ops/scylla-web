<script lang="ts">
  import { Combobox as ComboboxPrimitive } from 'bits-ui';
  import type { Attachment } from 'svelte/attachments';
  import { cn } from '../../utils/index.ts';

  type Props = ComboboxPrimitive.InputProps & {
    value?: string;
    /** Svelte's `autofocus` does nothing when another element holds the focus. */
    focusOnMount?: boolean;
  };

  let { class: className, value = '', focusOnMount = false, ...rest }: Props = $props();

  const focus: Attachment<HTMLInputElement> = element => element.focus();
</script>

<!--
  The owner gives the text. bits-ui keeps what the user typed when the list closes, and writes the
  label of each pick, also when the owner then clears its value.
-->
<ComboboxPrimitive.Input {...rest}>
  {#snippet child({ props })}
    <input
      {...props}
      {value}
      {@attach focusOnMount ? focus : undefined}
      data-slot="combobox-input"
      autocomplete="off"
      class={cn(
        'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-border h-8 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
    />
  {/snippet}
</ComboboxPrimitive.Input>
