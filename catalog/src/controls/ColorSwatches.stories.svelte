<script module lang="ts">
  import { ColorSwatches } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/ColorSwatches', component: ColorSwatches });

  const RECENT = ['#E879F9', '#F97316', '#22D3EE', '#4338CA'];
</script>

<script lang="ts">
  let theme = $state<string | undefined>('chart-2');
  let free = $state<string | undefined>('#4338CA');
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-start gap-8">
    <Specimen label="a color of the theme ({theme})">
      <ColorSwatches value={theme} onchange={color => (theme = color)} recent={RECENT} />
    </Specimen>
    <Specimen label="a free color ({free})">
      <ColorSwatches value={free} onchange={color => (free = color)} recent={RECENT} />
    </Specimen>
    <Specimen label="disabled">
      <ColorSwatches value="primary" onchange={() => {}} disabled />
    </Specimen>
  </div>
</Story>
