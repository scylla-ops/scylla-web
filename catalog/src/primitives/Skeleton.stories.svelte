<script module lang="ts">
  import { Skeleton } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Primitives/Skeleton', component: Skeleton });
</script>

<Story name="Shapes" asChild>
  <div class="flex flex-wrap items-start gap-10">
    <Specimen label="line"><Skeleton class="h-4 w-48" /></Specimen>
    <Specimen label="avatar"><Skeleton class="size-10 rounded-full" /></Specimen>
    <Specimen label="card"><Skeleton class="h-24 w-64 rounded-xl" /></Specimen>
    <Specimen label="row">
      <div class="flex items-center gap-3">
        <Skeleton class="size-8 rounded-full" />
        <div class="grid gap-2">
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-3 w-24" />
        </div>
      </div>
    </Specimen>
  </div>
</Story>
