<script lang="ts">
  import LibraryBigIcon from '@lucide/svelte/icons/library-big';
  import StarIcon from '@lucide/svelte/icons/star';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { scyllaNavigate } from '@platform/context';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import { filterFragments } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';
  import SearchField from '@base/features/pipeline/presentation/ui/editor/controls/SearchField.svelte';
  import { dragToCanvas } from '../../palette-drag/palette-drag.attachments.ts';
  import type { PaletteDrag } from '../../palette-drag/palette-drag.state.svelte.ts';
  import LibraryPaletteRow from './LibraryPaletteRow.svelte';

  interface Props {
    fragments: readonly FragmentEntity[];
    workspaceName: string;
    /** A click adds the fragment after the start node; a drag places it where it is dropped. */
    onAdd: (fragment: FragmentEntity) => void;
    drag?: PaletteDrag;
  }

  let { fragments, workspaceName, onAdd, drag }: Props = $props();

  let query = $state('');

  const found = $derived(
    filterFragments(fragments, { query, scope: 'all', tag: null, source: 'all', order: 'most-used' }),
  );
  const groups = $derived(
    [
      { title: t(libraryMessages.favorites), icon: true, items: found.filter(f => f.favorite) },
      {
        title: t(libraryMessages.workspaceLibrary(workspaceName)),
        icon: false,
        items: found.filter(f => !f.favorite && !f.source),
      },
      { title: t(libraryMessages.community), icon: false, items: found.filter(f => !f.favorite && f.source) },
    ].filter(group => group.items.length),
  );
</script>

<div class="flex h-full flex-col">
  <div class="p-3 pb-2">
    <SearchField bind:value={query} label={t(libraryMessages.searchLibrary)} />
  </div>

  <div class="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
    {#each groups as group (group.title)}
      <h3 class="flex items-center gap-1.5 px-2 pt-3 pb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
        {#if group.icon}<StarIcon class="size-3" />{/if}
        {group.title}
      </h3>
      {#each group.items as fragment (fragment.id)}
        <button
          type="button"
          class={cn(
            'flex w-full cursor-grab items-center gap-2.5 rounded-lg p-2 text-left transition-[background-color,opacity] select-none hover:bg-accent active:cursor-grabbing',
            drag?.entry?.id === fragment.id && 'opacity-40',
          )}
          {@attach drag && dragToCanvas(() => ({ entry: fragment, drag }))}
          onclick={() => onAdd(fragment)}
        >
          <LibraryPaletteRow {fragment} />
        </button>
      {/each}
    {:else}
      <p class="px-2 py-4 text-sm text-muted-foreground">
        {t(fragments.length ? libraryMessages.noFragment : libraryMessages.emptyLibrary)}
      </p>
    {/each}
  </div>

  <div class="flex flex-col gap-2 border-t px-4 py-3">
    <p class="text-[11.5px] leading-relaxed text-muted-foreground">{t(libraryMessages.paletteHint)}</p>
    <button
      type="button"
      class="flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
      onclick={() => scyllaNavigate.goToWorkspaceRoute('library')}
    >
      <LibraryBigIcon class="size-3.5" />
      {t(libraryMessages.browseLibrary)}
    </button>
  </div>
</div>
