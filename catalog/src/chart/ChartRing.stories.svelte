<script module lang="ts">
  import { ChartRing, type ChartRingArc } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const OUTCOMES: ChartRingArc[] = [
    { value: 146, tone: 'passed' },
    { value: 15, tone: 'failed' },
    { value: 3, tone: 'queued' },
  ];

  const { Story } = defineMeta({ title: 'Chart/Ring', component: ChartRing });
</script>

<Story name="Sizes" asChild>
  <div class="flex items-center gap-8">
    <Specimen label="lg, 3 arcs">
      <ChartRing arcs={OUTCOMES} total={164} value="89%" label="89 % success" />
    </Specimen>
    <Specimen label="sm, 3 arcs">
      <ChartRing size="sm" arcs={OUTCOMES} total={164} value="89%" label="89 % success" />
    </Specimen>
    <Specimen label="lg, one arc of a total">
      <ChartRing arcs={[{ value: 1312, tone: 'primary' }]} total={2000} value="66%" label="66 % used" />
    </Specimen>
    <Specimen label="lg, empty">
      <ChartRing arcs={[]} total={0} label="No data" />
    </Specimen>
  </div>
</Story>
