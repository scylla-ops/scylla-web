<script module lang="ts">
  import ListIcon from '@lucide/svelte/icons/list';
  import NetworkIcon from '@lucide/svelte/icons/network';
  import { SegmentedControl, type SegmentedOption } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const PERIODS: SegmentedOption[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  const VIEWS: SegmentedOption[] = [
    { value: 'list', label: 'List', icon: ListIcon },
    { value: 'graph', label: 'Graph', icon: NetworkIcon },
  ];

  const { Story } = defineMeta({ title: 'Controls/SegmentedControl', component: SegmentedControl });
</script>

<script lang="ts">
  let period = $state('week');
  let view = $state('list');
  let filter = $state('all');
  let running = $state(2);

  const filters = $derived<SegmentedOption[]>([
    { value: 'all', label: 'All', count: 12 },
    {
      value: 'running',
      label: 'Running',
      count: running,
      dot: { color: 'text-status-running', pulse: true },
    },
    { value: 'failed', label: 'Failed', count: 0, dot: { color: 'text-status-failed' } },
    { value: 'queued', label: 'Queued', count: 3, dot: { color: 'text-status-queued', hollow: true } },
  ]);
</script>

<Story name="Sizes and options" asChild>
  <div class="grid max-w-2xl gap-8">
    <Specimen label="default">
      <SegmentedControl options={PERIODS} value={period} onChange={next => (period = next)} aria-label="Period" />
    </Specimen>
    <Specimen label="sm">
      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={next => (period = next)}
        size="sm"
        aria-label="Period"
      />
    </Specimen>
    <Specimen label="icons">
      <SegmentedControl options={VIEWS} value={view} onChange={next => (view = next)} aria-label="View" />
    </Specimen>
    <Specimen label="fill" class="w-full">
      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={next => (period = next)}
        fill
        aria-label="Period"
      />
    </Specimen>
  </div>
</Story>

<Story name="Counts and dots" asChild>
  <div class="grid gap-6">
    <SegmentedControl options={filters} value={filter} onChange={next => (filter = next)} aria-label="Runs" />
    <div class="flex gap-2">
      <Button variant="outline" size="sm" onclick={() => (running += 1)}>One more running</Button>
      <Button variant="outline" size="sm" onclick={() => (running = Math.max(0, running - 1))}>
        One less running
      </Button>
    </div>
  </div>
</Story>

<Story name="Segment states" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="hover" state="hover">
      <SegmentedControl options={PERIODS} value="week" onChange={() => {}} aria-label="Period" />
    </Specimen>
    <Specimen label="focus" state="focus">
      <SegmentedControl options={PERIODS} value="week" onChange={() => {}} aria-label="Period" />
    </Specimen>
  </div>
</Story>
