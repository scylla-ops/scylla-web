<script module lang="ts">
  import { EntityIcon, entityGlyph } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/EntityIcon', component: EntityIcon });

  const FOLDER = entityGlyph('folder');
  const ROCKET = entityGlyph('rocket');
  const IMAGE =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="1" height="2" fill="%23E879F9"/><rect x="1" width="1" height="2" fill="%2322D3EE"/></svg>';
</script>

<Story name="Kinds" asChild>
  <div class="flex flex-wrap items-center gap-6">
    <Specimen label="default (folder, primary)">
      <EntityIcon icon={FOLDER} />
    </Specimen>
    <Specimen label="glyph, color of the theme">
      <EntityIcon icon={ROCKET} color="chart-2" />
    </Specimen>
    <Specimen label="free color, enough contrast in dark">
      <EntityIcon icon={ROCKET} color="#E879F9" />
    </Specimen>
    <Specimen label="free color, low contrast in dark: solid tile">
      <EntityIcon icon={ROCKET} color="#4338CA" />
    </Specimen>
    <Specimen label="image">
      <EntityIcon image={IMAGE} label="web" />
    </Specimen>
  </div>
</Story>

<Story name="Sizes" asChild>
  <div class="flex flex-wrap items-center gap-6">
    <Specimen label="16 (a name in a line of text)">
      <EntityIcon icon={ROCKET} color="chart-2" size={16} />
    </Specimen>
    <Specimen label="20 (sidebar)">
      <EntityIcon icon={ROCKET} color="chart-2" size={20} />
    </Specimen>
    <Specimen label="24 (a row with an avatar)">
      <EntityIcon icon={ROCKET} color="chart-2" size={24} />
    </Specimen>
    <Specimen label="32 (the header of a section)">
      <EntityIcon icon={ROCKET} color="chart-2" size={32} />
    </Specimen>
    <Specimen label="36 (card)">
      <EntityIcon icon={ROCKET} color="chart-2" size={36} />
    </Specimen>
    <Specimen label="48 (page header, dialog)">
      <EntityIcon icon={ROCKET} color="chart-2" size={48} />
    </Specimen>
    <Specimen label="72 (centered preview of a form)">
      <EntityIcon icon={ROCKET} color="chart-2" size={72} />
    </Specimen>
  </div>
</Story>
