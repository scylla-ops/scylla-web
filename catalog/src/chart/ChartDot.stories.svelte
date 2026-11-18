<script module lang="ts">
  import { ChartDot, type ChartTone } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const TONES: ChartTone[] = ['passed', 'failed', 'running', 'queued', 'canceled', 'skipped', 'primary', 'info', 'warning', 'muted'];

  const { Story } = defineMeta({ title: 'Chart/Dot', component: ChartDot });
</script>

<Story name="Tones" asChild>
  <Specimen label="tones">
    <div class="flex items-center gap-3">
      {#each TONES as tone (tone)}<ChartDot {tone} />{/each}
    </div>
  </Specimen>
</Story>
