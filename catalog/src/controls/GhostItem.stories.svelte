<script module lang="ts">
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import { GHOST_ITEM_SHAPES, GhostItem, type GhostItemShape } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/GhostItem', component: GhostItem });

  const SHAPES = Object.keys(GHOST_ITEM_SHAPES) as GhostItemShape[];
</script>

<Story name="Shapes" asChild>
  <div class="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
    {#each SHAPES as shape (shape)}
      <Specimen label={shape} class="items-stretch">
        <GhostItem label="New project" {shape} onclick={() => {}} />
      </Specimen>
    {/each}
  </div>
</Story>

<Story name="States" asChild>
  <div class="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
    <Specimen label="hovered" state="hover" class="items-stretch">
      <GhostItem label="New project" shape="row" onclick={() => {}} />
    </Specimen>
    <Specimen label="focused" state="focus" class="items-stretch">
      <GhostItem label="New project" shape="row" onclick={() => {}} />
    </Specimen>
    <Specimen label="a link, another icon" class="items-stretch">
      <GhostItem label="New group" shape="row" icon={FolderPlusIcon} href="#new-group" />
    </Specimen>
  </div>
</Story>
