<script module lang="ts">
  import { ColorGlyph, entityGlyph } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/ColorGlyph', component: ColorGlyph });

  const FOLDER = entityGlyph('folder')!;
</script>

<Story name="Colors" asChild>
  <div class="flex flex-wrap items-center gap-6">
    <Specimen label="no color (grey)">
      <ColorGlyph icon={FOLDER} />
    </Specimen>
    <Specimen label="color of the theme">
      <ColorGlyph icon={FOLDER} color="chart-2" />
    </Specimen>
    <Specimen label="free color, enough contrast in dark">
      <ColorGlyph icon={FOLDER} color="#E879F9" />
    </Specimen>
    <Specimen label="free color, low contrast in dark: filled">
      <ColorGlyph icon={FOLDER} color="#4338CA" />
    </Specimen>
    <Specimen label="20 px">
      <ColorGlyph icon={FOLDER} color="chart-4" class="size-5" />
    </Specimen>
  </div>
</Story>
