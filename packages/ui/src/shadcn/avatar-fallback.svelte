<script lang="ts">
  import { Avatar as AvatarPrimitive } from 'bits-ui';
  import { cn } from '../utils/index.ts';

  let { class: className, ...rest }: AvatarPrimitive.FallbackProps = $props();
</script>

<AvatarPrimitive.Fallback
  data-slot="avatar-fallback"
  class={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
  {...rest}
/>
