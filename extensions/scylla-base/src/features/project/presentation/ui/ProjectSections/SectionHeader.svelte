<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import PinIcon from '@lucide/svelte/icons/pin';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectCounts } from '@base/features/project/domain/structs/project-search.struct.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { sectionHealth } from '@base/features/project/presentation/presenters/project-sections.presenter.ts';
  import { reorderIn } from '../reorder.transition.ts';

  interface Props {
    name: string;
    count: number;
    /** The pins show a pin; the groups and « No group » a folder. */
    pins: boolean;
    open: boolean;
    counts?: ProjectCounts;
    /** A dragged card is over the header: the text of the drop. */
    dropText?: string;
    menu?: Snippet;
    onToggle: () => void;
  }

  let { name, count, pins, open, counts, dropText, menu, onToggle }: Props = $props();

  const health = $derived(sectionHealth(counts));
  const Chevron = $derived(open ? ChevronDownIcon : ChevronRightIcon);
  const Icon = $derived(pins ? PinIcon : FolderIcon);
</script>

<div
  class={cn(
    'flex min-h-8 items-center gap-3 rounded-lg transition-[background-color,padding] duration-150 motion-reduce:transition-none',
    dropText && 'border-[1.5px] border-primary bg-primary/8 py-1 pr-3 pl-2',
  )}
  data-part="project-section-header"
  role="group"
>
  <!-- The whole row opens and closes the section; the menu does not. -->
  <button
    type="button"
    class="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    aria-expanded={open}
    onclick={onToggle}
  >
    <Chevron class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="min-w-0 truncate text-sm font-semibold text-foreground">{name}</span>
    <span class="shrink-0 text-sm font-medium text-muted-foreground">{count}</span>
    {#if health}
      <span class="flex shrink-0 items-center gap-1.5 pl-1">
        <span
          class={cn(
            'size-2.5 rounded-full',
            health.kind === 'failed' ? 'bg-destructive' : 'bg-warning',
          )}
          aria-hidden="true"
        ></span>
        <span class="text-xs text-muted-foreground">
          {t(
            health.kind === 'failed'
              ? projectMessages.sectionFailing(health.count)
              : projectMessages.sectionRunning(health.count),
          )}
        </span>
      </span>
    {/if}
  </button>
  {#if dropText}
    <span class="shrink-0 text-sm font-medium text-primary" in:reorderIn>{dropText}</span>
  {:else if menu}
    {@render menu()}
  {/if}
</div>
