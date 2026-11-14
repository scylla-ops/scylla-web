<script lang="ts">
  import SearchIcon from '@lucide/svelte/icons/search';
  import {
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import type { RepositoryPicker } from './repository-picker.state.svelte.ts';

  interface Props {
    picker: RepositoryPicker;
  }

  let { picker }: Props = $props();

  const id = $props.id();
</script>

<div class="flex flex-col gap-2">
  <Label for="{id}-connection">{t(messages.connection)}</Label>
  <Select
    type="single"
    value={picker.connection?.id ?? ''}
    onValueChange={value => picker.pickConnection(value)}
  >
    <SelectTrigger id="{id}-connection" class="w-full">{picker.connectionLabel}</SelectTrigger>
    <SelectContent>
      {#each picker.connections as item (item.id)}
        <SelectItem value={item.id} label={item.label}>{item.label}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

<div class="relative">
  <SearchIcon
    class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
    aria-hidden="true"
  />
  <Input
    class="pl-9"
    placeholder={t(messages.findRepository)}
    aria-label={t(messages.findRepository)}
    autocomplete="off"
    bind:value={picker.typed}
    onkeydown={event => {
      // Enter in the search must not submit the form.
      if (event.key === 'Enter') event.preventDefault();
    }}
  />
</div>
