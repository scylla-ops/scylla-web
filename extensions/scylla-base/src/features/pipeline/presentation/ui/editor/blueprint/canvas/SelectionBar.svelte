<script lang="ts">
  import BookmarkPlusIcon from '@lucide/svelte/icons/bookmark-plus';
  import LayersIcon from '@lucide/svelte/icons/layers';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    count: number;
    /** No callback: the selection cannot be saved, and the bar offers the delete only. */
    onSave?: () => void;
    onDelete: () => void;
  }

  let { count, onSave, onDelete }: Props = $props();
</script>

<!-- Under the canvas, while a box or Shift selects several nodes: what the selection can become. -->
<div
  role="toolbar"
  aria-label={t(libraryMessages.selectedNodes(count))}
  class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-card p-1.5 shadow-md"
>
  <span class="flex items-center gap-2 px-2 text-[13px] font-medium">
    <LayersIcon class="size-4 text-muted-foreground" />
    {t(libraryMessages.selectedNodes(count))}
  </span>
  {#if onSave}
    <Button size="sm" onclick={onSave}>
      <BookmarkPlusIcon class="size-4" />
      {t(libraryMessages.saveToLibrary)}
    </Button>
  {/if}
  <Button size="sm" variant="ghost-destructive" onclick={onDelete}>
    {t(libraryMessages.deleteSelection)}
  </Button>
</div>
