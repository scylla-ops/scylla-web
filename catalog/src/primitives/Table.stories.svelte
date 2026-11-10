<script module lang="ts">
  import {
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const ROWS = [
    { id: 'build', runs: 128, state: 'Passed' },
    { id: 'deploy', runs: 42, state: 'Failed' },
    { id: 'nightly', runs: 7, state: 'Running' },
  ];

  const { Story } = defineMeta({
    title: 'Primitives/Table',
    component: Table,
    subcomponents: { TableFrame, TableHeader, TableBody, TableRow, TableHead, TableCell },
  });
</script>

<Story name="In a frame" asChild>
  <TableFrame class="max-w-xl">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pipeline</TableHead>
          <TableHead class="text-right">Runs</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each ROWS as row, index (row.id)}
          <TableRow data-state={index === 1 ? 'selected' : undefined} onclick={() => {}}>
            <TableCell class="font-medium">{row.id}</TableCell>
            <TableCell class="text-right">{row.runs}</TableCell>
            <TableCell>{row.state}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </TableFrame>
</Story>
