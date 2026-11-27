<script module lang="ts">
  import { DROP_SLOT_SHAPES, DropSlot, type DropSlotShape } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Data display/DropSlot', component: DropSlot });

  const SHAPES = Object.keys(DROP_SLOT_SHAPES) as DropSlotShape[];
</script>

<Story name="Shapes" asChild>
  <div class="grid w-full max-w-3xl grid-cols-2 gap-6">
    {#each SHAPES as shape (shape)}
      <Specimen label={shape} class="items-stretch">
        <DropSlot {shape} />
      </Specimen>
    {/each}
  </div>
</Story>

<Story name="With a text" asChild>
  <div class="w-full max-w-md">
    <Specimen label="card, with a text" class="items-stretch">
      <DropSlot shape="card">Drop a card here to pin it.</DropSlot>
    </Specimen>
  </div>
</Story>
