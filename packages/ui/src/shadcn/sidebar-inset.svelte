<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../utils/index.ts';
  import { SIDEBAR_MOTION } from './sidebar-variants.ts';

  type Props = HTMLAttributes<HTMLElement> & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<main
  data-slot="sidebar-inset"
  class={cn(
    'bg-background relative flex w-full flex-1 flex-col transition-[margin]',
    SIDEBAR_MOTION,
    'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</main>
