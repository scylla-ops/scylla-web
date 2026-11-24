<script module lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import { GatedButton } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Controls/GatedButton', component: GatedButton });
</script>

<Story name="Allowed and denied" asChild>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-end gap-8">
      <Specimen label="allowed"><GatedButton><PlusIcon />New</GatedButton></Specimen>
      <Specimen label="allowed, hover" state="hover"><GatedButton><PlusIcon />New</GatedButton></Specimen>
      <Specimen label="allowed, focus" state="focus"><GatedButton><PlusIcon />New</GatedButton></Specimen>
      <Specimen label="denied (hover it for the reason)">
        <GatedButton allowed={false} deniedReason="Only an owner can add a pipeline.">
          <PlusIcon />New
        </GatedButton>
      </Specimen>
      <Specimen label="denied, default reason">
        <GatedButton allowed={false}><PlusIcon />New</GatedButton>
      </Specimen>
    </div>
    <div class="flex flex-wrap items-end gap-8">
      <Specimen label="destructive, icon, tooltip">
        <GatedButton variant="destructive" size="icon" tooltip="Delete" aria-label="Delete">
          <TrashIcon />
        </GatedButton>
      </Specimen>
      <Specimen label="destructive, denied">
        <GatedButton variant="destructive" size="icon" allowed={false} aria-label="Delete">
          <TrashIcon />
        </GatedButton>
      </Specimen>
      <Specimen label="outline, disabled">
        <GatedButton variant="outline" disabled>Export</GatedButton>
      </Specimen>
    </div>
  </div>
</Story>
