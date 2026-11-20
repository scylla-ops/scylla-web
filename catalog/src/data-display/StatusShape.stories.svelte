<script module lang="ts">
  import { StatusShape, type StatusState } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const STATES: StatusState[] = [
    'pending',
    'idle',
    'running',
    'success',
    'failed',
    'orphaned',
    'skipped',
    'cancelled',
  ];
  const SIZES = [16, 24, 40, 64];

  const { Story } = defineMeta({
    title: 'Data display/StatusShape',
    component: StatusShape,
    argTypes: { state: { control: 'select', options: STATES } },
  });
</script>

<Story name="Playground" args={{ state: 'running', label: 'Running', size: 64 }} />

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    {#each STATES as state (state)}
      <Specimen label={state}><StatusShape {state} label={state} /></Specimen>
    {/each}
  </div>
</Story>

<Story name="Sizes" asChild>
  <div class="flex flex-wrap items-end gap-8">
    {#each SIZES as size (size)}
      <Specimen label="{size} px"><StatusShape state="running" label="Running" {size} /></Specimen>
    {/each}
  </div>
</Story>
