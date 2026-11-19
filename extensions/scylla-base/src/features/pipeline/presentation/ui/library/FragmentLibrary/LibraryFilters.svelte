<script lang="ts">
  import { Tabs, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { FragmentLibrary, LibraryTab } from './fragment-library.state.svelte.ts';

  interface Props {
    library: FragmentLibrary;
  }

  let { library }: Props = $props();
</script>

<!-- The tabs choose the fragments; the chips narrow them to a tag. -->
<div class="flex flex-col gap-4">
  <Tabs value={library.tab} onValueChange={value => (library.tab = value as LibraryTab)}>
    <TabsList>
      <TabsTrigger value="organization">{t(libraryMessages.organization)}</TabsTrigger>
      <TabsTrigger value="favorites">{t(libraryMessages.favorites)}</TabsTrigger>
      <TabsTrigger value="community" disabled>
        {t(libraryMessages.community)}
        <span class="rounded-full border px-1.5 text-[10.5px] font-medium">{t(libraryMessages.soon)}</span>
      </TabsTrigger>
    </TabsList>
  </Tabs>
  {#if library.tags.length}
    <div role="group" aria-label={t(libraryMessages.tags)} class="flex flex-wrap gap-1.5">
      {#each [null, ...library.tags] as tag (tag)}
        <button
          type="button"
          aria-pressed={library.tag === tag}
          class={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-primary/50',
            library.tag === tag ? 'border-primary bg-primary text-primary-foreground' : 'bg-background',
          )}
          onclick={() => (library.tag = tag)}
        >
          {tag ?? t(libraryMessages.allTags)}
        </button>
      {/each}
    </div>
  {/if}
</div>
