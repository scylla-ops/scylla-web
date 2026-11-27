<script module lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import RocketIcon from '@lucide/svelte/icons/rocket';
  import { EntityIcon, PreviewBlock } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Layout/PreviewBlock', component: PreviewBlock });
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-start gap-8">
    <Specimen label="preview and actions" class="w-[464px]">
      <PreviewBlock label="Icon" class="w-full">
        {#snippet preview()}
          <EntityIcon icon={RocketIcon} color="chart-2" size={72} />
        {/snippet}
        {#snippet actions()}
          <Button variant="outline" size="sm"><PaletteIcon aria-hidden="true" />Change</Button>
          <Button variant="ghost" size="sm">Reset</Button>
        {/snippet}
      </PreviewBlock>
    </Specimen>
    <Specimen label="preview only" class="w-[464px]">
      <PreviewBlock label="Icon" class="w-full">
        {#snippet preview()}
          <EntityIcon icon={RocketIcon} color="chart-2" size={72} />
        {/snippet}
      </PreviewBlock>
    </Specimen>
  </div>
</Story>
