<script module lang="ts">
  import { StatusTrail, type StatusState, type StatusTrailItem } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const STATES: StatusState[] = [
    'success',
    'success',
    'failed',
    'skipped',
    'cancelled',
    'success',
    'pending',
    'running',
  ];

  const itemsOf = (onSelect?: () => void): StatusTrailItem[] =>
    STATES.map((state, index) => ({ id: `run-${index}`, state, label: `Run ${index + 1}: ${state}`, onSelect }));

  const { Story } = defineMeta({ title: 'Data display/StatusTrail', component: StatusTrail });
</script>

{#snippet tooltip(item: StatusTrailItem)}{item.label}{/snippet}

<Story name="Cases" asChild>
  <div class="grid gap-8">
    <Specimen label="dots"><StatusTrail items={itemsOf()} emptyLabel="No run yet" /></Specimen>
    <Specimen label="buttons, with tooltips">
      <StatusTrail items={itemsOf(() => {})} {tooltip} emptyLabel="No run yet" />
    </Specimen>
    <Specimen label="buttons, hover" state="hover">
      <StatusTrail items={itemsOf(() => {})} emptyLabel="No run yet" />
    </Specimen>
    <Specimen label="buttons, focus" state="focus">
      <StatusTrail items={itemsOf(() => {})} emptyLabel="No run yet" />
    </Specimen>
    <Specimen label="empty"><StatusTrail items={[]} emptyLabel="No run yet" /></Specimen>
  </div>
</Story>
