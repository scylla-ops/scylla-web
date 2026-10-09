<script lang="ts">
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import { cn } from '../utils/index.ts';

  let { class: className, ...rest }: AvatarPrimitive.ImageProps = $props();
</script>

<AvatarPrimitive.Image
  data-slot="avatar-image"
  class={cn('aspect-square h-full w-full', className)}
  {...rest}
/>
