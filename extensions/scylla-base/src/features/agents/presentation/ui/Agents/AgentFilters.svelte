<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { Input, ToggleGroup, ToggleGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { AGENT_FILTERS, type AgentFilter } from './agents-page.state.svelte.ts';
  import { agentsMessages } from '@base/features/agents/presentation/messages/agents.messages.ts';
  import { agentsPageMessages as messages } from '@base/features/agents/presentation/messages/agents-page.messages.ts';

  interface Props {
    filter: AgentFilter;
    counts: Record<AgentFilter, number>;
    search: string;
    onFilterChange: (filter: AgentFilter) => void;
    onSearchChange: (search: string) => void;
  }

  let { filter, counts, search, onFilterChange, onSearchChange }: Props = $props();

  const LABELS: Record<AgentFilter, MessageDescriptor> = {
    all: messages.filterAll,
    online: messages.online,
    offline: agentsMessages.stateOffline,
    never: agentsMessages.stateNever,
    disabled: agentsMessages.stateDisabled,
  };
</script>

<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <ToggleGroup
    type="single"
    spacing={0.5}
    value={filter}
    onValueChange={value => {
      if (value) onFilterChange(value as AgentFilter);
    }}
    aria-label={t(messages.filterByState)}
    class="max-w-full flex-wrap rounded-lg bg-muted p-1"
  >
    {#each AGENT_FILTERS as option (option)}
      <ToggleGroupItem
        value={option}
        size="sm"
        class="h-7 gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
      >
        {t(LABELS[option])}
        <span class="tabular-nums opacity-70">{counts[option]}</span>
      </ToggleGroupItem>
    {/each}
  </ToggleGroup>

  <label class="relative block w-full md:w-72">
    <span class="sr-only">{t(messages.searchPlaceholder)}</span>
    <SearchIcon
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
    />
    <Input
      type="search"
      value={search}
      oninput={event => onSearchChange(event.currentTarget.value)}
      placeholder={t(messages.searchPlaceholder)}
      class="pl-9"
    />
  </label>
</div>
