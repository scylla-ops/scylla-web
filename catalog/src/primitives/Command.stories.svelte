<script module lang="ts">
  import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Primitives/Command',
    component: Command,
    subcomponents: { CommandInput, CommandList, CommandGroup, CommandItem },
  });
</script>

<Story name="List" asChild>
  <div class="w-80 rounded-xl border bg-popover">
    <Command label="Search" loop>
      <div class="border-b px-3">
        <CommandInput placeholder="Search a page" aria-label="Search" class="h-10" />
      </div>
      <CommandList>
        <CommandGroup heading="Pages">
          <CommandItem value="dashboard">Dashboard</CommandItem>
          <CommandItem value="pipelines">Pipelines</CommandItem>
          <CommandItem value="secrets">Secrets</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Settings">
          <CommandItem value="members">Members</CommandItem>
          <CommandItem value="billing" disabled>Billing</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
</Story>
