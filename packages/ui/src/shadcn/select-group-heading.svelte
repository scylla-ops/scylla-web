<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import { cn } from '../utils/index.ts';

  let { class: className, ...rest }: SelectPrimitive.GroupHeadingProps = $props();
</script>

<SelectPrimitive.GroupHeading
  data-slot="select-group-heading"
  class={cn('px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground', className)}
  {...rest}
/>
