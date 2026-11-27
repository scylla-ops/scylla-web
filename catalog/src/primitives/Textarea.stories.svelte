<script module lang="ts">
  import { Textarea } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const LONG = 'A long line that goes on and on, '.repeat(20);

  const { Story } = defineMeta({ title: 'Primitives/Textarea', component: Textarea });
</script>

<Story name="Playground" args={{ placeholder: 'Description', disabled: false }}>
  {#snippet template(args)}
    <Textarea {...args} class="max-w-xs" />
  {/snippet}
</Story>

<Story name="States" asChild>
  <div class="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
    <Specimen label="placeholder, 3 lines" class="w-full">
      <Textarea placeholder="Add a description..." />
    </Specimen>
    <Specimen label="long text: grows to 8 lines, then scrolls" class="w-full">
      <Textarea value={LONG} />
    </Specimen>
    <Specimen label="focus" state="focus" class="w-full"><Textarea value="A short text" /></Specimen>
    <Specimen label="disabled" class="w-full"><Textarea value="A short text" disabled /></Specimen>
    <Specimen label="invalid" class="w-full">
      <Textarea value="A short text" aria-invalid="true" />
    </Specimen>
  </div>
</Story>
