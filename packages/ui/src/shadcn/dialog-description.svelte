<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import { cn } from '../utils/index.ts';

  let { class: className, ...rest }: DialogPrimitive.DescriptionProps = $props();
</script>

<DialogPrimitive.Description
  data-slot="dialog-description"
  class={cn('text-sm text-muted-foreground', className)}
  {...rest}
/>
