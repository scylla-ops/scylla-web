<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';
  import { DROP_SLOT_SHAPES, type DropSlotShape } from './drop-slot.ts';

  type Props = HTMLAttributes<HTMLDivElement> & {
    shape?: DropSlotShape;
    /** A short text in the middle of the slot, e.g. the name of the target. */
    children?: Snippet;
  };

  let { shape = 'card', children, class: className, ...rest }: Props = $props();
</script>

<!-- The place where a dragged item goes when the person releases it. -->
<div
  data-slot="drop-slot"
  data-shape={shape}
  aria-hidden={children ? undefined : 'true'}
  class={cn(
    'flex w-full items-center justify-center border-[1.5px] border-dashed border-primary bg-primary/8 px-3 text-center text-sm font-medium text-primary',
    DROP_SLOT_SHAPES[shape],
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
