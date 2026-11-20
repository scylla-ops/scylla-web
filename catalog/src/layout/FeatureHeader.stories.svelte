<script module lang="ts">
  import UploadIcon from '@lucide/svelte/icons/upload';
  import { FeatureHeader } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Layout/FeatureHeader', component: FeatureHeader });
</script>

<script lang="ts">
  let selected = $state(2);
</script>

{#snippet importButton()}<Button variant="outline"><UploadIcon />Import</Button>{/snippet}

{#snippet underLabel()}<p class="text-sm text-muted-foreground">In the project acme-web</p>{/snippet}

<Story name="Cases" asChild>
  <div class="grid max-w-4xl gap-10">
    <Specimen label="count and new" class="w-full">
      <FeatureHeader count={12} label="pipeline" pluralLabel="pipelines" onNew={() => {}} newLabel="New pipeline" />
    </Specimen>
    <Specimen label="no count yet (loading)" class="w-full">
      <FeatureHeader label="pipeline" pluralLabel="pipelines" onNew={() => {}} />
    </Specimen>
    <Specimen label="selection" class="w-full">
      <FeatureHeader
        count={12}
        label="pipeline"
        pluralLabel="pipelines"
        selectedCount={selected}
        onSelectAll={() => (selected = 12)}
        onClearSelection={() => (selected = 0)}
        onDeleteSelection={() => {
          selected = 0;
        }}
        onNew={() => {}}
      />
    </Specimen>
    <Specimen label="denied: new and delete" class="w-full">
      <FeatureHeader
        count={12}
        label="pipeline"
        pluralLabel="pipelines"
        selectedCount={1}
        onClearSelection={() => {}}
        onDeleteSelection={() => {}}
        canDelete={false}
        deleteDeniedReason="Only an owner can delete a pipeline."
        onNew={() => {}}
        canNew={false}
        newDeniedReason="Only an owner can add a pipeline."
      />
    </Specimen>
    <Specimen label="extra actions and a line under the label" class="w-full">
      <FeatureHeader
        count={3}
        label="secret"
        pluralLabel="secrets"
        {underLabel}
        extraActions={importButton}
        onNew={() => {}}
      />
    </Specimen>
  </div>
</Story>
