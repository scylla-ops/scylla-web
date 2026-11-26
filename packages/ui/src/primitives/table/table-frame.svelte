<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';
  import { enter } from '../../motion/enter.ts';

  type Props = HTMLAttributes<HTMLDivElement> & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<!-- A table that replaces its skeleton fades in. -->
<div
  in:enter
  data-slot="table-frame"
  class={cn(
    'relative w-full overflow-x-auto rounded-2xl border border-border bg-card p-1.5',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
