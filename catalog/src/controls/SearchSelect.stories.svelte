<script module lang="ts">
  import { SearchSelect, type SearchSelectOption } from '@scylla/ui';
  import { Badge } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Specimen from '../Specimen.svelte';

  const PEOPLE: SearchSelectOption[] = [
    { value: 'ada', label: 'Ada Lovelace', hint: 'ada@example.com' },
    { value: 'grace', label: 'Grace Hopper', hint: 'grace@example.com' },
    { value: 'alan', label: 'Alan Turing', hint: 'alan@example.com', keywords: ['enigma'] },
    { value: 'linus', label: 'Linus Torvalds', hint: 'Already a member', disabled: true },
  ];

  const { Story } = defineMeta({ title: 'Controls/SearchSelect', component: SearchSelect });
</script>

<script lang="ts">
  let chosen = $state('grace');
</script>

{#snippet richRow(option: SearchSelectOption)}
  <span class="flex items-center gap-2">
    <Badge variant="secondary">{option.label.slice(0, 1)}</Badge>
    {option.label}
  </span>
{/snippet}

{#snippet chip(option: SearchSelectOption)}
  <Badge variant="secondary">{option.label}</Badge>
{/snippet}

<Story name="Cases" asChild>
  <div class="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
    <Specimen label="empty" class="w-full">
      <SearchSelect options={PEOPLE} placeholder="Add a member" aria-label="Member" />
    </Specimen>
    <Specimen label="value (click to open, type to search)" class="w-full">
      <SearchSelect options={PEOPLE} bind:value={chosen} aria-label="Member" />
    </Specimen>
    <Specimen label="chip" class="w-full">
      <SearchSelect options={PEOPLE} value="ada" {chip} aria-label="Member" />
    </Specimen>
    <Specimen label="rich rows" class="w-full">
      <SearchSelect options={PEOPLE} row={richRow} placeholder="Add a member" aria-label="Member" />
    </Specimen>
    <Specimen label="loading" class="w-full">
      <SearchSelect options={[]} loading placeholder="Add a member" aria-label="Member" />
    </Specimen>
    <Specimen label="no option" class="w-full">
      <SearchSelect
        options={[]}
        emptyText="Everybody is a member."
        placeholder="Add a member"
        aria-label="Member"
      />
    </Specimen>
    <Specimen label="focus" state="focus" class="w-full">
      <SearchSelect options={PEOPLE} placeholder="Add a member" aria-label="Member" />
    </Specimen>
    <Specimen label="disabled" class="w-full">
      <SearchSelect options={PEOPLE} value="ada" disabled aria-label="Member" />
    </Specimen>
  </div>
</Story>
