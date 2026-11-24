<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';
  import AlertDialogOverlay from './alert-dialog-overlay.svelte';
  import { CENTERED_DIALOG_CLASS, CLOSING_LAYER_CLASS } from '../dialog/dialog-variants.ts';

  let { class: className, children, ...rest }: AlertDialogPrimitive.ContentProps = $props();
</script>

<!--
  bits-ui has a real alert-dialog primitive, where `shadcn/alert-dialog.tsx`
  builds one out of Radix's plain dialog. So the port gains what the React one
  never had: `role="alertdialog"`, and a click outside that does not dismiss a
  destructive confirmation.

  The element comes from `child`: then bits-ui unlocks the page (`pointer-events`
  of `<body>`) when the dialog closes, not when its exit animation ends.
-->
<AlertDialogPrimitive.Portal>
  <AlertDialogOverlay />
  <AlertDialogPrimitive.Content
    data-slot="alert-dialog-content"
    class={cn(
      CENTERED_DIALOG_CLASS,
      CLOSING_LAYER_CLASS,
      'grid w-full max-w-lg gap-4 border border-border bg-card p-6 shadow-lg sm:rounded-xl',
      className,
    )}
    {...rest}
  >
    {#snippet child({ props })}
      <div {...props}>{@render children?.()}</div>
    {/snippet}
  </AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
