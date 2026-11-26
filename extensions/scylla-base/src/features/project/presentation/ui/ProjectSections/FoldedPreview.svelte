<script lang="ts">
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
  }

  let { projects, total, name, animate, onOpen }: Props = $props();

  let fit = $state<number | null>(null);
  const shown = $derived(Math.min(fit ?? projects.length, projects.length));
  const rest = $derived(total - shown);

  const CHIP =
    'inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-full border bg-card text-xs font-medium transition-colors outline-none hover:border-primary/50 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none';

  const open = (event: MouseEvent, projectId?: string) => {
    event.stopPropagation();
    onOpen(projectId);
  };
</script>

<!--
  One line under the header of a folded section: a chip for each project that fits, then "+N".
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
    <button
      type="button"
      class={cn(CHIP, 'max-w-48 gap-1.5 pr-2.5 pl-1', hidden && 'invisible order-last')}
      title={project.name}
      tabindex={hidden ? -1 : undefined}
      data-chip
      onclick={event => open(event, project.id)}
    >
      <ProjectIcon icon={project.icon} size={20} />
      <span class="min-w-0 truncate">{project.name}</span>
    </button>
  {/each}
  {#if rest > 0}
    <button
      type="button"
      class={cn(CHIP, 'border-dashed px-2.5 text-muted-foreground tabular-nums')}
      aria-label={t(projectMessages.moreProjects(rest))}
      title={t(projectMessages.moreProjects(rest))}
      data-more
      onclick={event => open(event)}
    >
      +{rest}
    </button>
  {/if}
</div>
