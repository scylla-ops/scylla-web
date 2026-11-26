<script module lang="ts">
  import { Chip, ColorGlyph, entityGlyph } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/Chip', component: Chip });

  const FOLDER = entityGlyph('folder')!;
</script>

{#snippet icon()}<ColorGlyph icon={FOLDER} color="chart-3" class="size-5" />{/snippet}

<Story name="Variants" asChild>
  <div class="flex flex-wrap items-end gap-6">
    <Specimen label="default, with an icon">
      <Chip {icon}>web</Chip>
    </Specimen>
    <Specimen label="default, no icon">
      <Chip>docs</Chip>
    </Specimen>
    <Specimen label="long name">
      <Chip {icon}>a project with a very long name</Chip>
    </Specimen>
    <Specimen label="more">
      <Chip variant="more" aria-label="3 more projects">+3</Chip>
    </Specimen>
  </div>
</Story>

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-6">
    <Specimen label="hovered" state="hover">
      <Chip {icon}>web</Chip>
    </Specimen>
    <Specimen label="focused" state="focus">
      <Chip {icon}>web</Chip>
    </Specimen>
  </div>
</Story>
