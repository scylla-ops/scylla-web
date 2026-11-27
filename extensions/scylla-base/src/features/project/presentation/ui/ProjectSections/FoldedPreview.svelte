<script lang="ts">
  import { Chip, enter, exit } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import ProjectIcon from '../ProjectIcon/ProjectIcon.svelte';
  import { fitChips } from './folded-chips.attachments.ts';
  import { staggerCards } from './section-open.attachments.ts';

  interface Props {
    /** The first projects of the section, in its order. */
    projects: readonly ProjectEntity[];
    /** The projects of the section: the ones with no chip count in "+N". */
    total: number;
    /** The name of the section. */
    name: string;
    /** The person folded the section now: the chips fade in one after the other. */
    animate: boolean;
    /** Opens the section, at a project when a chip gives it. */
    onOpen: (projectId?: string) => void;
    /** A dragged card goes last into the section: the slot of its name opens at the end of the line. */
    dropName?: string;
  }

  let { projects, total, name, animate, onOpen, dropName }: Props = $props();

  let fit = $state<number | null>(null);
  const shown = $derived(Math.min(fit ?? projects.length, projects.length));
  const rest = $derived(total - shown);

  const open = (event: MouseEvent, projectId?: string) => {
    event.stopPropagation();
    onOpen(projectId);
  };
</script>

<!--
  One line under the header of a folded section: a chip for each project that fits, then "+N",
  then the slot of a card that a drag puts last in the section.
  A click on a chip opens the section at its card; a click on "+N" or on the free part of the line
  opens the section. The chips are the way of the keyboard.
-->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div
  class="flex h-8 min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden"
  role="group"
  aria-label={t(projectMessages.foldedLine(total, name))}
  data-part="folded-preview"
  onclick={() => onOpen()}
  {@attach fitChips(() => total, count => (fit = count))}
  {@attach animate && staggerCards}
>
  {#each projects as project, index (project.id)}
    {@const hidden = index >= shown}
    <Chip
      class={cn(hidden && 'invisible order-last')}
      title={project.name}
      tabindex={hidden ? -1 : undefined}
      data-chip
      onclick={(event: MouseEvent) => open(event, project.id)}
    >
      {#snippet icon()}<ProjectIcon icon={project.icon} size={20} />{/snippet}
      {project.name}
    </Chip>
  {/each}
  {#if rest > 0}
    <Chip
      variant="more"
      aria-label={t(projectMessages.moreProjects(rest))}
      title={t(projectMessages.moreProjects(rest))}
      data-more
      onclick={(event: MouseEvent) => open(event)}
    >
      +{rest}
    </Chip>
  {/if}
  {#if dropName}
    <span
      class="flex h-7 max-w-48 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-primary bg-primary/8 px-3 text-xs font-medium text-primary"
      data-part="folded-drop-slot"
      aria-hidden="true"
      in:enter
      out:exit
    >
      <span class="min-w-0 truncate">{dropName}</span>
    </span>
  {/if}
</div>
