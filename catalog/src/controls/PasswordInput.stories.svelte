<script module lang="ts">
  import { PasswordInput } from '@scylla/ui';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({
    title: 'Controls/PasswordInput',
    component: PasswordInput,
    args: { value: 'correct horse', autocomplete: 'current-password' },
  });
</script>

<Story name="Playground" args={{ disabled: false }} />

<Story name="States" asChild>
  <div class="flex flex-wrap items-end gap-8">
    <Specimen label="default"><PasswordInput value="correct horse" /></Specimen>
    <Specimen label="focus" state="focus"><PasswordInput value="correct horse" /></Specimen>
    <Specimen label="disabled"><PasswordInput value="correct horse" disabled /></Specimen>
  </div>
</Story>
