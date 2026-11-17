<script module lang="ts">
  import { ChartSlot } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Chart/Slot', component: ChartSlot });
</script>

<Story name="States" asChild>
  <div class="flex gap-6">
    <Specimen label="busy"><ChartSlot state="busy" /></Specimen>
    <Specimen label="free"><ChartSlot state="free" /></Specimen>
    <Specimen label="offline"><ChartSlot state="offline" /></Specimen>
  </div>
</Story>
