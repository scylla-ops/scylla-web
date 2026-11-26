<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../../utils/index.ts';
  import { CLOSING_LAYER_CLASS, MODAL_TIMING_CLASS } from './dialog-variants.ts';

  let { class: className, ...rest }: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
  data-slot="dialog-overlay"
  class={cn(
    'fixed inset-0 z-50 bg-overlay/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    MODAL_TIMING_CLASS,
    CLOSING_LAYER_CLASS,
    className,
  )}
  {...rest}
/>
