<script module lang="ts">
  import { Input } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const { Story } = defineMeta({ title: 'Primitives/Input', component: Input });
</script>

<Story name="Playground" args={{ placeholder: 'Name', disabled: false }}>
  {#snippet template(args)}
    <Input {...args} class="max-w-xs" />
  {/snippet}
</Story>

<Story name="States" asChild>
  <div class="grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-3">
    <Specimen label="placeholder"><Input placeholder="my-project" /></Specimen>
    <Specimen label="value"><Input value="my-project" /></Specimen>
    <Specimen label="hover" state="hover"><Input value="my-project" /></Specimen>
    <Specimen label="focus" state="focus"><Input value="my-project" /></Specimen>
    <Specimen label="disabled"><Input value="my-project" disabled /></Specimen>
    <Specimen label="read only"><Input value="my-project" readonly /></Specimen>
    <Specimen label="invalid"><Input value="my project" aria-invalid="true" /></Specimen>
    <Specimen label="invalid, focus" state="focus">
      <Input value="my project" aria-invalid="true" />
    </Specimen>
  </div>
</Story>

<Story name="Types" asChild>
  <div class="grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-3">
    <Specimen label="email"><Input type="email" placeholder="ada@example.com" /></Specimen>
    <Specimen label="password"><Input type="password" value="secret-value" /></Specimen>
    <Specimen label="number"><Input type="number" value={10} /></Specimen>
    <Specimen label="search"><Input type="search" placeholder="Search" /></Specimen>
    <Specimen label="file"><Input type="file" /></Specimen>
  </div>
</Story>
