<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import XIcon from '@lucide/svelte/icons/x';
  import { cn } from '../../utils/index.ts';
  import { t } from '../../i18n/lingui.adapter.svelte.ts';
  import { dialogMessages } from '../dialog/dialog.messages.ts';
  import { CLOSING_LAYER_CLASS, MODAL_TIMING_CLASS } from '../dialog/dialog-variants.ts';

  type Props = SheetPrimitive.ContentProps & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    /** Classes of the overlay behind the sheet, e.g. a lighter color. */
    overlayClass?: string;
    children?: Snippet;
  };

  let { class: className, side = 'right', overlayClass, children, ...rest }: Props = $props();
</script>

<!-- The element comes from `child`, as in `dialog-content.svelte`. -->
<SheetPrimitive.Portal>
  <SheetPrimitive.Overlay
    data-slot="sheet-overlay"
    class={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay/50 motion-reduce:animate-none',
      MODAL_TIMING_CLASS,
      CLOSING_LAYER_CLASS,
      overlayClass,
    )}
  />
  <SheetPrimitive.Content
    data-slot="sheet-content"
    class={cn(
      'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition data-[state=open]:duration-250 data-[state=open]:ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:animate-none motion-reduce:transition-none',
      CLOSING_LAYER_CLASS,
      side === 'right' &&
        'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
      side === 'left' &&
        'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
      side === 'top' &&
        'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
      side === 'bottom' &&
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
      className,
    )}
    {...rest}
  >
    {#snippet child({ props })}
      <div {...props}>
        {@render children?.()}
        <SheetPrimitive.Close
          class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
        >
          <XIcon class="size-4" />
          <span class="sr-only">{t(dialogMessages.close)}</span>
        </SheetPrimitive.Close>
      </div>
    {/snippet}
  </SheetPrimitive.Content>
</SheetPrimitive.Portal>
