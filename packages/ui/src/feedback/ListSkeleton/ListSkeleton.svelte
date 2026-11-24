<script lang="ts">
  import { cn } from '../../utils/index.ts';
  import Skeleton from '../../primitives/skeleton/skeleton.svelte';

  interface Props {
    /** The number of rows to show. */
    rows?: number;
    /** The shape of one row: its height, its corners. Default: a list row. */
    rowClass?: string;
    /** The layout of the rows, e.g. a grid of cards. Default: one column. */
    class?: string;
    /** A title bar first, in the place of the `FeatureHeader` of the page. */
    header?: boolean;
    /** Read by a screen reader in place of the rows. */
    label?: string;
  }

  let {
    rows = 3,
    rowClass = 'h-14 w-full',
    class: className,
    header = false,
    label,
  }: Props = $props();
</script>

<!-- The rows of a list that loads. The `Skeleton` waits before it shows: a fast load shows nothing. -->
<div
  data-slot="list-skeleton"
  class="flex w-full flex-col gap-4"
  role="status"
  aria-busy="true"
  aria-label={label}
>
  {#if header}
    <div class="flex items-center justify-between gap-4">
      <Skeleton class="h-10 w-56" />
      <Skeleton class="h-9 w-28" />
    </div>
  {/if}
  <div class={cn('flex flex-col gap-2', className)}>
    {#each Array.from({ length: rows }) as _, index (index)}
      <Skeleton class={rowClass} />
    {/each}
  </div>
</div>
