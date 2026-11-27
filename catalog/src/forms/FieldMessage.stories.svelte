<script module lang="ts">
  import { FieldMessage } from '@scylla/ui';
  import { Input } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Forms/FieldMessage', component: FieldMessage });
</script>

<script lang="ts">
  let shown = $state(true);
</script>

<Story name="Cases" asChild>
  <div class="grid max-w-4xl grid-cols-1 gap-10 md:grid-cols-2">
    <Specimen label="under a field: slides in and out" class="w-full">
      <div class="flex w-full flex-col gap-2">
        <Input aria-invalid={shown} value="abc" />
        <FieldMessage message={shown && 'Type a port from 1 to 65535.'} />
        <Input value="Below" />
        <button type="button" class="text-xs underline" onclick={() => (shown = !shown)}>
          Toggle the error
        </button>
      </div>
    </Specimen>
    <Specimen label="under a whole form" class="w-full">
      <FieldMessage role="alert" size="sm" message="The form could not be sent." />
    </Specimen>
  </div>
</Story>
