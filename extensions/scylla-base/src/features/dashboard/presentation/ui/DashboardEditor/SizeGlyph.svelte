<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { LayoutSize } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { SIZE_CELLS } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

  interface Props {
    size: LayoutSize;
    class?: string;
  }

  let { size, class: className }: Props = $props();

  const GRID = { columns: 4, rows: 4 };
  const cells = $derived(SIZE_CELLS[size]);
</script>

<span aria-hidden="true" class={cn('grid grid-cols-4 gap-0.5', className)}>
  {#each { length: GRID.columns * GRID.rows } as _, index (index)}
    {@const filled = index % GRID.columns < cells.columns && Math.floor(index / GRID.columns) < cells.rows}
    <span class="h-2.5 w-3.5 rounded-[2px] {filled ? 'bg-foreground/70' : 'bg-muted'}"></span>
  {/each}
</span>
