<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { IconButton } from '@scylla/ui';
  import { Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { SaveFragment } from './save-fragment.state.svelte.ts';

  interface Props {
    draft: SaveFragment;
  }

  let { draft }: Props = $props();

  let typed = $state('');

  /** Enter or a comma makes a tag of the text; Backspace in an empty field removes the last one. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      draft.addTag(typed);
      typed = '';
    } else if (event.key === 'Backspace' && !typed && draft.tags.length) {
      draft.removeTag(draft.tags[draft.tags.length - 1]);
    }
  };
</script>

<div class="flex flex-col gap-1.5">
  <Label for="fragment-tags">{t(libraryMessages.tags)}</Label>
  <div
    class="flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-border px-1.5 py-1 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
  >
    {#each draft.tags as tag (tag)}
      <span class="flex items-center gap-0.5 rounded-full bg-muted py-0.5 pr-1 pl-2 text-xs font-medium">
        {tag}
        <IconButton
          icon={XIcon}
          tooltip={t(libraryMessages.removeTag(tag))}
          variant="destructive"
          onclick={() => draft.removeTag(tag)}
          class="size-5 rounded-full"
          iconClass="size-3"
        />
      </span>
    {/each}
    <input
      id="fragment-tags"
      bind:value={typed}
      onkeydown={onKeyDown}
      onblur={() => {
        draft.addTag(typed);
        typed = '';
      }}
      placeholder={t(libraryMessages.addTag)}
      class="min-w-16 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
    />
  </div>
</div>
