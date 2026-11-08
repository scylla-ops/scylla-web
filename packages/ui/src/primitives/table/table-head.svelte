<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLThAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLThAttributes & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<th
  data-slot="table-head"
  class={cn(
    'h-8 bg-muted px-4 text-left align-middle text-xs font-normal whitespace-nowrap text-muted-foreground first:rounded-l-[10px] last:rounded-r-[10px] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</th>
