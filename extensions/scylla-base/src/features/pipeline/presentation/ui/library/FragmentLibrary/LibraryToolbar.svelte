<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import StoreIcon from '@lucide/svelte/icons/store';
  import { scyllaNavigate } from '@platform/context';
  import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
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

  const title = $derived(
    library.tab === 'community' ? communityMessages.communityFragments : libraryMessages.fragments,
  );
</script>

<header class="flex flex-wrap items-center gap-3">
  <h1 class="mr-auto">
    <span class="text-primary">{library.shown.length}</span>
    {t(title(library.shown.length))}
  </h1>
  <Input
    type="search"
    value={library.query}
    oninput={event => (library.query = event.currentTarget.value)}
    placeholder={t(libraryMessages.searchFragments)}
    aria-label={t(libraryMessages.searchLibrary)}
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
  <Button onclick={() => scyllaNavigate.goToWorkspaceRoute('marketplace')}>
    <StoreIcon class="size-4" />
    {t(communityMessages.browseMarketplace)}
  </Button>
</header>
