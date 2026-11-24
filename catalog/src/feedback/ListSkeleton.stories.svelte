<script module lang="ts">
  import { ListSkeleton } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Feedback/ListSkeleton', component: ListSkeleton });
</script>

<Story name="Cases" asChild>
  <div class="grid max-w-3xl gap-10">
    <Specimen label="rows" class="w-full"><ListSkeleton label="Loading the pipelines" /></Specimen>
    <Specimen label="with a header" class="w-full"><ListSkeleton header rows={2} /></Specimen>
    <Specimen label="grid of cards" class="w-full">
      <ListSkeleton rows={6} rowClass="h-28 w-full rounded-xl" class="grid grid-cols-3 gap-3" />
    </Specimen>
  </div>
</Story>
