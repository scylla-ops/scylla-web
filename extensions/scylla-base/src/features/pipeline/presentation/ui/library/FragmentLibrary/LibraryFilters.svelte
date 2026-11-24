<script lang="ts">
  import { Tabs, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { SourceFilter } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import type { FragmentLibrary, LibraryTab } from './fragment-library.state.svelte.ts';
  import FilterChips from './FilterChips.svelte';

  interface Props {
    library: FragmentLibrary;
  }

  let { library }: Props = $props();

  const sources = $derived<{ value: SourceFilter; label: string }[]>([
    { value: 'all', label: t(communityMessages.allSources) },
    { value: 'linked', label: t(communityMessages.linkedCount(library.counts.linked)) },
    { value: 'forked', label: t(communityMessages.forkedCount(library.counts.forked)) },
    { value: 'update', label: t(communityMessages.updateCount(library.counts.update)) },
  ]);
  const tags = $derived([
    { value: null, label: t(libraryMessages.allTags) },
    ...library.tags.map(tag => ({ value: tag, label: tag })),
  ]);
</script>

<!-- The tabs choose the fragments; the chips narrow them, to a tag or to a source. -->
<div class="flex flex-col gap-4">
  <Tabs value={library.tab} onValueChange={value => (library.tab = value as LibraryTab)}>
    <TabsList>
      <TabsTrigger value="organization">
        {t(communityMessages.tabWithCount(t(libraryMessages.organization), library.counts.organization))}
      </TabsTrigger>
      <TabsTrigger value="favorites">{t(libraryMessages.favorites)}</TabsTrigger>
      <TabsTrigger value="community">
        {t(communityMessages.tabWithCount(t(libraryMessages.community), library.counts.community))}
      </TabsTrigger>
    </TabsList>
  </Tabs>
  {#if library.tab === 'community'}
    <FilterChips
      label={t(communityMessages.sourceFilter)}
      options={sources}
      value={library.source}
      onChange={value => (library.source = value)}
    />
  {:else if library.tags.length}
    <FilterChips
      label={t(libraryMessages.tags)}
      options={tags}
      value={library.tag}
      onChange={value => (library.tag = value)}
    />
  {/if}
</div>
