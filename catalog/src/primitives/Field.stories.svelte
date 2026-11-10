<script module lang="ts">
  import {
    Checkbox,
    Field,
    FieldGroup,
    FieldLabel,
    Input,
    Label,
    Switch,
    type FieldOrientation,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const ORIENTATIONS: FieldOrientation[] = ['vertical', 'horizontal', 'responsive'];

  const { Story } = defineMeta({
    title: 'Primitives/Field',
    component: Field,
    subcomponents: { FieldGroup, FieldLabel, Label },
  });
</script>

<Story name="Orientations" asChild>
  <div class="grid max-w-xl gap-8">
    {#each ORIENTATIONS as orientation (orientation)}
      <Specimen label={orientation} class="w-full">
        <FieldGroup class="w-full">
          <Field {orientation}>
            <FieldLabel for="name-{orientation}">Name</FieldLabel>
            <Input id="name-{orientation}" placeholder="my-project" />
          </Field>
        </FieldGroup>
      </Specimen>
    {/each}
  </div>
</Story>

<Story name="Group" asChild>
  <FieldGroup class="max-w-sm">
    <Field>
      <FieldLabel for="email">Email</FieldLabel>
      <Input id="email" type="email" placeholder="ada@example.com" />
    </Field>
    <Field data-invalid="true">
      <FieldLabel for="slug">Slug</FieldLabel>
      <Input id="slug" value="My Project" aria-invalid="true" />
      <p class="text-sm">Use lower case letters, digits and dashes.</p>
    </Field>
    <Field orientation="horizontal">
      <Checkbox id="notify" checked />
      <FieldLabel for="notify">Send me an email after each run</FieldLabel>
    </Field>
    <Field orientation="horizontal">
      <Switch id="public" />
      <FieldLabel for="public">Public project</FieldLabel>
    </Field>
  </FieldGroup>
</Story>

<Story name="Label" asChild>
  <div class="flex flex-wrap items-end gap-6">
    <Specimen label="default"><Label for="plain">Name</Label></Specimen>
    <Specimen label="beside a disabled control">
      <div class="flex items-center gap-2">
        <Checkbox id="off" disabled />
        <Label for="off">Archived</Label>
      </div>
    </Specimen>
  </div>
</Story>
