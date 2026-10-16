<script lang="ts" generics="TData extends RowData">
  import type { Snippet } from 'svelte';
  import { createTable, FlexRender } from '@tanstack/svelte-table';
  import type { Row, RowData } from '@tanstack/table-core';
  import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import { t } from '../../i18n/i18n-svelte.svelte.ts';
  import { dataTableMessages } from './data-table.messages.ts';
  import { createCompactContainer } from '../../state/compact-container.svelte.ts';
  import { setDataTableLayout } from './data-table-layout.ts';
  import {
    CARD_LAYOUT_WIDTH_PX,
    DATA_TABLE_FEATURES,
    alignClass,
    buildGridTemplate,
    cellAlignClass,
    groupByCardSlot,
    headAlignClass,
    minTableWidthOf,
    type ColumnAlign,
    type DataTableColumn,
    type DataTableFeatures,
  } from './data-table.ts';

  type TableRowOf = Row<DataTableFeatures, TData>;

  interface Props {
    columns: DataTableColumn<TData>[];
    data: TData[];
    onRowClick?: (row: TableRowOf) => void;
    getRowId?: (row: TData, index: number) => string;
    isRowSelected?: (row: TData) => boolean;
    /** Rendered in a full-width row under the row it belongs to. */
    expandedContent?: Snippet<[TableRowOf]>;
    isRowExpanded?: (row: TData) => boolean;
    alignColumnsCenter?: boolean;
    alignRowsCenter?: boolean;
  }

  let {
    columns,
    data,
    onRowClick,
    getRowId,
    isRowSelected,
    expandedContent,
    isRowExpanded,
    alignColumnsCenter = false,
    alignRowsCenter = false,
  }: Props = $props();

  // Getters: the adapter re-reads them, which keeps `getRowModel()` in step with the data.
  const table = createTable<DataTableFeatures, TData>({
    features: DATA_TABLE_FEATURES,
    get columns() {
      return columns;
    },
    get data() {
      return data;
    },
    get getRowId() {
      return getRowId;
    },
  });

  const gridTemplateColumns = $derived(buildGridTemplate(columns));
  const minTableWidth = $derived(minTableWidthOf(columns));
  const rowStyle = $derived(`grid-template-columns: ${gridTemplateColumns}`);

  const defaultAlign = (centered: boolean): ColumnAlign => (centered ? 'center' : 'left');

  // Measured on the table's own box: the sidebar takes part of the viewport.
  const layout = createCompactContainer(CARD_LAYOUT_WIDTH_PX);
  setDataTableLayout({
    get isCard() {
      return layout.isCompact;
    },
  });

  const headerLabelOf = (header: unknown): string | undefined =>
    typeof header === 'string' ? header : undefined;
</script>

{#snippet emptyState()}
  <div class="flex h-28 items-center justify-center text-sm text-muted-foreground">
    {t(dataTableMessages.noResults)}
  </div>
{/snippet}

{#snippet card(row: TableRowOf)}
  {@const selected = isRowSelected?.(row.original) ?? false}
  {@const slots = groupByCardSlot(row.getAllCells())}
  <!-- A row is a click target, not a control: its actions are real buttons. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    data-slot="data-table-card"
    data-state={selected ? 'selected' : undefined}
    onclick={() => onRowClick?.(row)}
    class={cn(
      'flex min-w-0 flex-col gap-2.5 rounded-2xl border border-border/70 bg-card py-3 pr-2 pl-3.5 text-sm shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-colors duration-150',
      onRowClick && 'cursor-pointer',
      onRowClick && !selected && 'active:bg-muted/40',
      selected && 'border-primary/60 bg-primary/[0.07]',
    )}
  >
    {#if slots.title.length > 0 || slots.actions.length > 0}
      <div class="flex min-w-0 items-center gap-2">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          {#each slots.title as cell (cell.id)}
            <div class="min-w-0 overflow-hidden last:min-w-24 last:flex-1"><FlexRender {cell} /></div>
          {/each}
        </div>
        {#if slots.actions.length > 0}
          <div class="flex shrink-0 items-center gap-1">
            {#each slots.actions as cell (cell.id)}
              <div><FlexRender {cell} /></div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#each slots.body as cell (cell.id)}
      <!-- Cells built for a centred column: in a card they start at the left edge. -->
        <div class="min-w-0 pr-1.5 *:justify-start"><FlexRender {cell} /></div>
    {/each}

    {#if slots.meta.length > 0}
      <dl class="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1.5 pr-1.5">
        {#each slots.meta as cell (cell.id)}
          {@const label = headerLabelOf(cell.column.columnDef.header)}
          <div class="flex min-w-0 items-center gap-2">
            {#if label}
              <dt
                class="text-[0.625rem] font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground/90 uppercase"
              >
                {label}
              </dt>
            {/if}
            <dd class="min-w-0 *:items-start *:justify-start"><FlexRender {cell} /></dd>
          </div>
        {/each}
      </dl>
    {/if}
  </div>
{/snippet}

<div {@attach layout.measure} class="h-full w-full">
  {#if layout.isCompact}
    <ul class="flex flex-col gap-2.5">
      {#each table.getRowModel().rows as row (row.id)}
        <li class="flex flex-col">
          {@render card(row)}
          {#if (isRowExpanded?.(row.original) ?? false) && expandedContent}
            <div class="mx-2 -mt-2 overflow-hidden rounded-b-2xl border border-t-0 border-border/70 bg-muted/30 pt-2">
              {@render expandedContent(row)}
            </div>
          {/if}
        </li>
      {:else}
      <li class="rounded-2xl border border-border/70 bg-card">{@render emptyState()}</li>
    {/each}
  </ul>
{:else}
    <div
      class="relative h-full w-full overflow-auto rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04),0_12px_32px_-16px_oklch(0_0_0/0.18)]"
    >
      <!-- Rows are CSS grids (see `buildGridTemplate`); table, thead and tbody stay blocks so
        the header can stick. They lose their implicit ARIA roles: restate them. -->
      <!-- svelte-ignore a11y_no_redundant_roles -->
      <table
        role="table"
        class="block w-full text-sm"
        style:min-width={minTableWidth > 0 ? `${minTableWidth}px` : undefined}
      >
        <TableHeader
          role="rowgroup"
          class="sticky top-0 z-10 block bg-card/80 shadow-[inset_0_-1px_0_0_var(--border)] backdrop-blur-xl"
        >
          {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
            <TableRow role="row" class="grid hover:bg-transparent" style={rowStyle}>
              {#each headerGroup.headers as header (header.id)}
                {@const align = header.column.columnDef.meta?.align ?? defaultAlign(alignColumnsCenter)}
                <TableHead
                  role="columnheader"
                  class={cn(
                    'flex h-11 min-w-0 items-center overflow-hidden px-5 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground/90 uppercase',
                    alignClass[align],
                    headAlignClass[align],
                  )}
                >
                  {#if !header.isPlaceholder}
                    <FlexRender {header} />
                  {/if}
                </TableHead>
              {/each}
            </TableRow>
          {/each}
        </TableHeader>

        <TableBody role="rowgroup" class="block">
          {#each table.getRowModel().rows as row (row.id)}
            {@const selected = isRowSelected?.(row.original) ?? false}
            <TableRow
              role="row"
              data-state={selected ? 'selected' : undefined}
              onclick={() => onRowClick?.(row)}
              style={rowStyle}
              class={cn(
                'grid transition-colors duration-150',
                onRowClick && 'cursor-pointer',
                onRowClick && !selected && 'hover:bg-muted/40',
                // An inset shadow, not a border: the accent bar does not shift the first column.
                selected &&
                  '[&>td]:bg-primary/[0.07] [&>td:first-child]:shadow-[inset_3px_0_0_0_var(--primary)] hover:[&>td]:bg-primary/[0.1]',
              )}
            >
              {#each row.getAllCells() as cell (cell.id)}
                {@const align = cell.column.columnDef.meta?.align ?? defaultAlign(alignRowsCenter)}
                <TableCell
                  role="cell"
                  class={cn('flex min-w-0 items-center overflow-hidden px-5 py-3.5', alignClass[align])}
                >
                  <div class={cn('w-full min-w-0', cellAlignClass[align])}>
                    <FlexRender {cell} />
                  </div>
                </TableCell>
              {/each}
            </TableRow>

            {#if (isRowExpanded?.(row.original) ?? false) && expandedContent}
              <TableRow role="row" class="grid grid-cols-[minmax(0,1fr)] hover:bg-transparent">
                <TableCell role="cell" class="min-w-0 overflow-hidden bg-muted/30 p-0">
                  {@render expandedContent(row)}
                </TableCell>
              </TableRow>
            {/if}
          {:else}
            <TableRow role="row" class="grid grid-cols-[minmax(0,1fr)] hover:bg-transparent">
              <TableCell
                role="cell"
                class="flex h-28 items-center justify-center text-sm text-muted-foreground"
              >
                {t(dataTableMessages.noResults)}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </table>
    </div>
  {/if}
</div>
