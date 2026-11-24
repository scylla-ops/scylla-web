<script module lang="ts">
  import { ChartHeatCell } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const LEVELS = [0, 1, 2, 3, 4] as const;

  const { Story } = defineMeta({ title: 'Chart/Heat cell', component: ChartHeatCell });
</script>

<Story name="Levels" asChild>
  <Specimen label="levels 0 to 4">
    <div class="flex gap-3">
      {#each LEVELS as level (level)}<ChartHeatCell {level} />{/each}
    </div>
  </Specimen>
</Story>
