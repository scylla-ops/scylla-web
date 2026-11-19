<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { Input, Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import {
    FRAGMENT_ORDERS,
    type FragmentOrder,
  } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import type { FragmentLibrary } from './fragment-library.state.svelte.ts';

  interface Props {
    library: FragmentLibrary;
  }

  let { library }: Props = $props();

  const ORDER_LABELS: Record<FragmentOrder, MessageDescriptor> = {
    'most-used': libraryMessages.sortMostUsed,
    recent: libraryMessages.sortRecent,
    name: libraryMessages.sortName,
  };
</script>

<header class="flex flex-wrap items-center gap-3">
  <h1 class="mr-auto">
    <span class="text-primary">{library.shown.length}</span>
    {t(libraryMessages.fragments)}
  </h1>
  <Input
    type="search"
    value={library.query}
    oninput={event => (library.query = event.currentTarget.value)}
    placeholder={t(libraryMessages.searchFragments)}
    aria-label={t(libraryMessages.searchLibrary(library.workspaceName))}
    class="w-64 bg-background"
  />
  <Select
    type="single"
    value={library.order}
    onValueChange={value => (library.order = value as FragmentOrder)}
  >
    <SelectTrigger aria-label={t(libraryMessages.sortBy)} class="w-44 bg-background">
      {t(ORDER_LABELS[library.order])}
    </SelectTrigger>
    <SelectContent>
      {#each FRAGMENT_ORDERS as order (order)}
        <SelectItem value={order} label={t(ORDER_LABELS[order])}>{t(ORDER_LABELS[order])}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</header>
