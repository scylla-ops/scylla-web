<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLAttributes<HTMLDivElement> & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<div
  data-slot="table-frame"
  class={cn(
    'relative w-full overflow-x-auto rounded-2xl border border-border bg-card p-1.5',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
