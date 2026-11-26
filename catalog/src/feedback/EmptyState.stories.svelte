<script module lang="ts">
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import PlayIcon from '@lucide/svelte/icons/play';
  import { EmptyState } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Feedback/EmptyState', component: EmptyState });
</script>

<Story name="Cases" asChild>
  <div class="grid max-w-xl gap-10">
    <Specimen label="with the action that adds the first item" class="w-full">
      <EmptyState
        icon={KeyRoundIcon}
        title="No secret yet"
        description="Add the passwords and the keys that the pipelines of this project use."
        action={{ label: 'New secret', onSelect: () => {} }}
      />
    </Specimen>
    <Specimen label="with another icon on the action" class="w-full">
      <EmptyState
        icon={ListChecksIcon}
        title="No jobs found"
        description="Run your pipeline to create the first job"
        action={{ label: 'Run', icon: PlayIcon, onSelect: () => {} }}
      />
    </Specimen>
    <Specimen label="no action: the person may not add" class="w-full">
      <EmptyState icon={KeyRoundIcon} title="No secret yet" description="Ask an admin to add one." />
    </Specimen>
  </div>
</Story>
