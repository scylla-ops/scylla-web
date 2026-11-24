<script module lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { ContextItem } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Layout/ContextItem', component: ContextItem });
</script>

<Story name="Cases" asChild>
  <div class="flex flex-wrap items-end gap-10">
    <Specimen label="name and description">
      <ContextItem name="acme-web" description="The website of Acme" icon={FolderIcon} />
    </Specimen>
    <Specimen label="name only"><ContextItem name="build" icon={WorkflowIcon} /></Specimen>
  </div>
</Story>
