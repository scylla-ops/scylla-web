<script module lang="ts">
  import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxTrigger,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const PEOPLE = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing'];

  const { Story } = defineMeta({
    title: 'Primitives/Combobox',
    component: Combobox,
    subcomponents: { ComboboxInput, ComboboxTrigger, ComboboxContent, ComboboxItem },
  });
</script>

<Story name="Open" asChild>
  <div class="h-56 w-64">
    <Combobox type="single" value="Grace Hopper" open allowDeselect={false}>
      <div class="relative w-full">
        <ComboboxInput value="Gr" class="pr-8" aria-label="Member" />
        <ComboboxTrigger aria-label="Show the options" />
      </div>
      <ComboboxContent>
        {#each PEOPLE as person (person)}
          <ComboboxItem value={person} label={person}>{person}</ComboboxItem>
        {/each}
        <ComboboxItem value="Linus Torvalds" label="Linus Torvalds" disabled>
          Linus Torvalds
        </ComboboxItem>
      </ComboboxContent>
    </Combobox>
  </div>
</Story>

<Story name="Closed" asChild>
  <div class="w-64">
    <Combobox type="single" allowDeselect={false}>
      <div class="relative w-full">
        <ComboboxInput placeholder="Add a member" class="pr-8" aria-label="Member" />
        <ComboboxTrigger aria-label="Show the options" />
      </div>
      <ComboboxContent>
        {#each PEOPLE as person (person)}
          <ComboboxItem value={person} label={person}>{person}</ComboboxItem>
        {/each}
      </ComboboxContent>
    </Combobox>
  </div>
</Story>
