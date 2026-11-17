<script module lang="ts">
  import { ChartSegment, type ChartTone } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const TONES: ChartTone[] = ['passed', 'failed', 'running', 'queued', 'canceled', 'skipped', 'primary', 'info', 'warning', 'muted'];

  const { Story } = defineMeta({ title: 'Chart/Segment', component: ChartSegment });
</script>

<Story name="Tones" asChild>
  <div class="grid gap-8">
    <Specimen label="bars">
      <div class="flex items-end gap-4">
        {#each TONES as tone (tone)}<ChartSegment {tone} class="h-8 w-3" />{/each}
      </div>
    </Specimen>
    <Specimen label="stacked bar">
      <div class="flex h-24 w-4 flex-col-reverse gap-px">
        <ChartSegment tone="passed" class="h-16" />
        <ChartSegment tone="failed" class="h-4" />
        <ChartSegment tone="queued" class="h-2" />
      </div>
    </Specimen>
  </div>
</Story>
