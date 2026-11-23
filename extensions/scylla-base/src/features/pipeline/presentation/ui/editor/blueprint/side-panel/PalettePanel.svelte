<script lang="ts">
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { CatalogEntry } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
  import type { PaletteDrag } from '../palette-drag/palette-drag.state.svelte.ts';
  import NodePalette from './NodePalette/NodePalette.svelte';
  import LibraryPalette from './LibraryPalette/LibraryPalette.svelte';

  interface Props {
    entries: readonly CatalogEntry[];
    fragments: readonly FragmentEntity[];
    workspaceName: string;
    /** `false`: the pipeline cannot link a fragment yet, the tab says why. */
    linkable: boolean;
    drag: PaletteDrag;
    onAdd: (entry: CatalogEntry) => void;
    onAddFragment: (fragment: FragmentEntity) => void;
  }

  let { entries, fragments, workspaceName, linkable, drag, onAdd, onAddFragment }: Props = $props();
</script>

<!-- What the canvas can receive: the nodes of the catalog, or the fragments of the library. -->
<Tabs value="nodes" class="flex h-full flex-col gap-0">
  <div class="flex flex-col gap-2.5 px-3 pt-3">
    <h2 class="px-1 text-sm">{t(blueprintMessages.addNode)}</h2>
    <TabsList class="w-full">
      <TabsTrigger value="nodes">{t(blueprintMessages.nodes)}</TabsTrigger>
      <TabsTrigger value="library">{t(libraryMessages.library)}</TabsTrigger>
    </TabsList>
  </div>
  <TabsContent value="nodes" class="min-h-0 flex-1">
    <NodePalette {entries} {onAdd} {drag} heading={false} />
  </TabsContent>
  <TabsContent value="library" class="min-h-0 flex-1">
    {#if linkable}
      <LibraryPalette {fragments} {workspaceName} onAdd={onAddFragment} {drag} />
    {:else}
      <p class="p-4 text-sm text-muted-foreground">{t(libraryMessages.paletteNeedsSave)}</p>
    {/if}
  </TabsContent>
</Tabs>
