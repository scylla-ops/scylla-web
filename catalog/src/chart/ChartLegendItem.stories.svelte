<script module lang="ts">
  import { ChartLegendItem } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Chart/Legend item', component: ChartLegendItem });
</script>

<Story name="Cases" asChild>
  <div class="grid gap-6">
    <Specimen label="with a value"><ChartLegendItem tone="passed" label="Completed" value={146} /></Specimen>
    <Specimen label="without a value"><ChartLegendItem tone="failed" label="Failed" /></Specimen>
  </div>
</Story>
