<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import PinIcon from '@lucide/svelte/icons/pin';
  import { ColorGlyph } from '@scylla/ui';
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
    /** The color of the folder of a group. Unset: grey. */
    color?: string;
    /** The folder as a control, e.g. the colors of the group: it takes the place of the folder. */
    folder?: Snippet;
    open: boolean;
    counts?: ProjectCounts;
    /** A dragged card is over the header: the text of the drop. */
    dropText?: string;
    /** The small actions before the menu, e.g. a new project in this group. */
    actions?: Snippet;
    menu?: Snippet;
    onToggle: () => void;
  }

  let {
    name,
    count,
    pins,
    color,
    folder,
    open,
    counts,
    dropText,
    actions,
    menu,
    onToggle,
  }: Props = $props();

  const health = $derived(sectionHealth(counts));
  const Chevron = $derived(open ? ChevronDownIcon : ChevronRightIcon);
</script>

<!-- A dragged card over the header: a frame around it, out of the flow, so that no line moves. -->
<div
  class={cn(
    'group/header relative flex min-h-8 items-center gap-3 rounded-lg',
    "before:pointer-events-none before:absolute before:-inset-x-2 before:-inset-y-1 before:rounded-lg before:border-[1.5px] before:border-primary before:bg-primary/8 before:opacity-0 before:transition-opacity before:duration-150 before:content-[''] motion-reduce:before:transition-none",
    dropText && 'before:opacity-100',
  )}
  data-part="project-section-header"
  role="group"
>
  <!-- The whole row opens and closes the section; the menu and the folder control do not. -->
  <div class="relative flex min-w-0 flex-1 items-center">
    <button
      type="button"
      class="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-expanded={open}
      onclick={onToggle}
    >
      <Chevron class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {#if folder}
        <!-- The place of the folder: the control is over it, out of the button. -->
        <span class="size-4 shrink-0" aria-hidden="true"></span>
      {:else if pins}
        <PinIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {:else}
        <ColorGlyph icon={FolderIcon} {color} />
      {/if}
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
    {#if folder}
      <!-- Centered on the place of the folder: the chevron (16 px) and the gap (8 px) come before it. -->
      <div class="absolute top-1/2 left-5 flex -translate-y-1/2 items-center justify-center max-md:left-4">
        {@render folder()}
      </div>
    {/if}
  </div>
  {#if dropText}
    <span class="shrink-0 text-sm font-medium text-primary" in:reorderIn>{dropText}</span>
  {:else if actions || menu}
    <div class="flex shrink-0 items-center gap-1">
      {@render actions?.()}
      {@render menu?.()}
    </div>
  {/if}
</div>
