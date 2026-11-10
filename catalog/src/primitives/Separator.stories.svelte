<script module lang="ts">
  import { Separator } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Primitives/Separator', component: Separator });
</script>

<Story name="Orientations" asChild>
  <div class="flex flex-wrap items-start gap-12">
    <Specimen label="horizontal" class="w-64">
      <p class="text-sm">Settings</p>
      <Separator />
      <p class="text-sm">Danger zone</p>
    </Specimen>
    <Specimen label="vertical">
      <div class="flex h-6 items-center gap-3 text-sm">
        <span>Runs</span>
        <Separator orientation="vertical" />
        <span>Logs</span>
        <Separator orientation="vertical" />
        <span>Settings</span>
      </div>
    </Specimen>
  </div>
</Story>
