<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLTableAttributes } from 'svelte/elements';
  import { cn } from '../../utils/index.ts';

  type Props = HTMLTableAttributes & { children?: Snippet };

  let { class: className, children, ...rest }: Props = $props();
</script>

<!-- Separate borders: the corners of a cell do not round when they collapse. The negative
  margin takes back the spacing above the header and under the last row. -->
<table
  data-slot="table"
  class={cn('-my-0.5 w-full border-separate border-spacing-y-0.5 text-sm', className)}
  {...rest}
>
  {@render children?.()}
</table>
