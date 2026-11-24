<script module lang="ts">
  import { DataTable, StatusShape, type DataTableColumn, type StatusState } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { renderComponent } from '@tanstack/svelte-table';
  import Specimen from '../Specimen.svelte';

  interface Run extends Record<string, unknown> {
    id: string;
    pipeline: string;
    state: StatusState;
    branch: string;
    duration: string;
  }

  const RUNS: Run[] = [
    { id: 'r-128', pipeline: 'build', state: 'success', branch: 'main', duration: '1 min 12 s' },
    { id: 'r-127', pipeline: 'deploy', state: 'failed', branch: 'main', duration: '4 min 3 s' },
    { id: 'r-126', pipeline: 'nightly', state: 'running', branch: 'release/0.7', duration: '12 s' },
    { id: 'r-125', pipeline: 'lint', state: 'pending', branch: 'feat/catalog', duration: '-' },
  ];

  const COLUMNS: DataTableColumn<Run>[] = [
    {
      id: 'state',
      header: 'State',
      size: 72,
      minSize: 72,
      meta: { align: 'center', card: 'actions' },
      cell: ({ row }) =>
        renderComponent(StatusShape, { state: row.original.state, label: row.original.state, size: 20 }),
    },
    { id: 'pipeline', header: 'Pipeline', accessorKey: 'pipeline', minSize: 120, meta: { card: 'title' } },
    { id: 'branch', header: 'Branch', accessorKey: 'branch', minSize: 120 },
    {
      id: 'duration',
      header: 'Duration',
      accessorKey: 'duration',
      size: 120,
      minSize: 100,
      meta: { align: 'right' },
    },
  ];

  const { Story } = defineMeta({ title: 'Data display/DataTable', component: DataTable });
</script>

<script lang="ts">
  let selected = $state('r-127');
</script>

{#snippet details()}
  <p class="p-3 text-sm text-muted-foreground">The steps of the run go here.</p>
{/snippet}

<Story name="Table" asChild>
  <div class="max-w-3xl">
    <DataTable
      columns={COLUMNS}
      data={RUNS}
      getRowId={run => run.id}
      isRowSelected={run => run.id === selected}
      onRowClick={row => (selected = row.original.id)}
    />
  </div>
</Story>

<Story name="Expanded row" asChild>
  <div class="max-w-3xl">
    <DataTable
      columns={COLUMNS}
      data={RUNS}
      getRowId={run => run.id}
      expandedContent={details}
      isRowExpanded={run => run.id === 'r-127'}
    />
  </div>
</Story>

<Story name="Cards (narrow box)" asChild>
  <Specimen label="below 640 px of its own width, one card per row" class="w-96">
    <div class="w-96">
      <DataTable
        columns={COLUMNS}
        data={RUNS}
        getRowId={run => run.id}
        isRowSelected={run => run.id === selected}
        onRowClick={row => (selected = row.original.id)}
      />
    </div>
  </Specimen>
</Story>

<Story name="Empty" asChild>
  <div class="max-w-3xl">
    <DataTable columns={COLUMNS} data={[]} />
  </div>
</Story>
