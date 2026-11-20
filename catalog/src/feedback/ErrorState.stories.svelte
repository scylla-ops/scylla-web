<script module lang="ts">
  import { ErrorState } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Feedback/ErrorState', component: ErrorState });
</script>

<Story name="Cases" asChild>
  <div class="grid max-w-xl gap-10">
    <Specimen label="default texts" class="w-full"><ErrorState /></Specimen>
    <Specimen label="title and message" class="w-full">
      <ErrorState title="The pipelines did not load" message="The server does not answer. Try again in a minute." />
    </Specimen>
  </div>
</Story>
