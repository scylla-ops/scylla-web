<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
  import { cn } from '../utils/index.ts';

  let { class: className, ...rest }: AlertDialogPrimitive.DescriptionProps = $props();
</script>

<AlertDialogPrimitive.Description
  data-slot="alert-dialog-description"
  class={cn('text-sm text-muted-foreground', className)}
  {...rest}
/>
