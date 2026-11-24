<script lang="ts">
  import { Skeleton } from '../../primitives/index.ts';
  import type { WidgetSize } from '../widget-size.ts';

  interface Props {
    size: WidgetSize;
  }

  let { size }: Props = $props();
</script>

{#snippet lines(widths: readonly string[])}
  <div class="flex flex-col gap-2">
    {#each widths as width, index (index)}
      <Skeleton class="h-2 {width}" />
    {/each}
  </div>
{/snippet}

{#if size === 'xs'}
  <div class="flex items-center gap-3">
    <Skeleton class="h-6 w-10 shrink-0" />
    {@render lines(['w-full', 'w-1/2'])}
  </div>
{:else if size === 's'}
  <div class="flex flex-col gap-4">
    <Skeleton class="h-6 w-16" />
    {@render lines(['w-full', 'w-2/3', 'w-1/2'])}
  </div>
{:else if size === 'm'}
  <div class="grid flex-1 grid-cols-2 gap-6">
    <div class="flex flex-col gap-4">
      <Skeleton class="h-6 w-16" />
      {@render lines(['w-full', 'w-2/3', 'w-1/2'])}
    </div>
    <Skeleton class="h-full min-h-16 w-full rounded-lg" />
  </div>
{:else}
  <div class="flex flex-1 flex-col gap-4">
    <Skeleton class="h-6 w-16" />
    {@render lines(['w-full', 'w-2/3', 'w-1/2'])}
    <Skeleton class="h-24 w-full rounded-lg" />
    <div class="flex flex-col gap-3">
      {#each { length: 4 } as _, index (index)}
        <div class="flex items-center gap-3">
          <Skeleton class="size-3 shrink-0 rounded-full" />
          <Skeleton class="h-2 flex-1" />
          <Skeleton class="h-2 w-10 shrink-0" />
        </div>
      {/each}
    </div>
  </div>
{/if}
