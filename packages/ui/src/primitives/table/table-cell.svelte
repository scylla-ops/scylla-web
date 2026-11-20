<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLTdAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLTdAttributes & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<td
  data-slot="table-cell"
  class={cn(
    'px-4 py-2.5 align-middle whitespace-nowrap transition-colors duration-150 first:rounded-l-[10px] last:rounded-r-[10px] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</td>
