<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
  import SearchIcon from '@lucide/svelte/icons/search';
  import type { Attachment } from 'svelte/attachments';
  import { Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { JobLogViewerState } from './job-log-viewer.state.svelte.ts';
  import ToolbarButton from './ToolbarButton.svelte';

  interface Props {
    viewer: JobLogViewerState;
    /** Gives the field to the viewer: `/` moves the focus to it. */
    field: Attachment<HTMLInputElement>;
  }

  let { viewer, field }: Props = $props();

  const count = $derived(viewer.search.items.length);
  const counter = $derived.by(() => {
    if (!viewer.query) return '';
    if (count === 0) return t(jobLogMessages.noMatch);
    if (viewer.search.index < 0) return t(jobLogMessages.matchCount(count));
    return t(jobLogMessages.matchOf(viewer.search.index + 1, count));
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) viewer.previousMatch();
      else viewer.nextMatch();
    } else if (event.key === 'Escape' && viewer.query) {
      // Escape clears the search. The shortcuts of the log do not read the keys of a field.
      event.preventDefault();
      viewer.setQuery('');
    }
  };
</script>

<!-- The search of the clean text: Enter for the next match, Shift+Enter for the one before. -->
<div class="flex min-w-0 items-center gap-1">
  <div class="relative flex min-w-0 items-center">
    <SearchIcon
      class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
      aria-hidden="true"
    />
    <Input
      type="search"
      value={viewer.query}
      oninput={event => viewer.setQuery(event.currentTarget.value)}
      onkeydown={onKeyDown}
      placeholder={t(jobLogMessages.searchPlaceholder)}
      aria-label={t(jobLogMessages.search)}
      aria-keyshortcuts="/"
      class="h-8 w-40 pl-8 text-xs md:w-52 md:text-xs"
      {@attach field}
    />
  </div>
  {#if viewer.query}
    <span role="status" class="min-w-14 text-center text-xs text-muted-foreground tabular-nums">
      {counter}
    </span>
    <ToolbarButton
      icon={ChevronUpIcon}
      label={t(jobLogMessages.previousMatch)}
      shortcut="Shift+Enter"
      disabled={count === 0}
      onclick={viewer.previousMatch}
    />
    <ToolbarButton
      icon={ChevronDownIcon}
      label={t(jobLogMessages.nextMatch)}
      shortcut="Enter"
      disabled={count === 0}
      onclick={viewer.nextMatch}
    />
  {/if}
</div>
