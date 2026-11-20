<script module lang="ts">
  import { ChartDelta } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Chart/Delta', component: ChartDelta });
</script>

<Story name="Directions and tones" asChild>
  <div class="flex flex-wrap gap-6">
    <Specimen label="up, good"><ChartDelta label="+3.4 pts" direction="up" tone="good" /></Specimen>
    <Specimen label="up, bad"><ChartDelta label="+3.4 pts" direction="up" tone="bad" /></Specimen>
    <Specimen label="down, good"><ChartDelta label="-12 %" direction="down" tone="good" /></Specimen>
    <Specimen label="down, bad"><ChartDelta label="-12 %" direction="down" tone="bad" /></Specimen>
    <Specimen label="flat, neutral"><ChartDelta label="0 pts" direction="flat" tone="neutral" /></Specimen>
  </div>
</Story>
