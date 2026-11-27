<script lang="ts">
  import MoveIcon from '@lucide/svelte/icons/move';
  import { Checkbox, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { createSelection } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import type { SectionKey } from '../../presenters/project-sections.presenter.ts';
  import { reorderIn } from '../reorder.transition.ts';
  import ProjectCardMenu from './ProjectCardMenu.svelte';

  interface Props {
    project: ProjectEntity;
    section?: SectionKey;
    /** The reorder mode: the move icon takes the place of the menu and of the checkbox. */
    reordering?: boolean;
    /** The checkbox of the selection. A tile has none. */
    select?: boolean;
  }

  let { project, section, reordering = false, select = true }: Props = $props();

  const selection = createSelection('projects');
  const isSelected = $derived(selection.selectedIds.includes(project.id));
</script>

<!-- The controls of a project in each shape: its menu and its checkbox, or the move icon. -->
{#if reordering}
  <span class="flex size-8 shrink-0 items-center justify-center text-muted-foreground" in:reorderIn>
    <MoveIcon class="size-4" aria-hidden="true" />
  </span>
{:else}
  <!-- At rest, a mouse sees no menu: it shows on hover, on focus, and while it is open. -->
  <ProjectCardMenu
    {project}
    {section}
    class="pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100 pointer-fine:data-[state=open]:opacity-100"
  />
  {#if select}
    <Tooltip>
      <TooltipTrigger>
        {#snippet child({ props })}
          <span {...props} class="flex size-4 shrink-0 items-center justify-center">
            <Checkbox
              checked={isSelected}
              aria-label={t(projectMessages.select)}
              class="relative cursor-pointer transition-all hover:border-primary max-md:after:absolute max-md:after:-inset-[15px]"
              onclick={event => event.stopPropagation()}
              onCheckedChange={() => selection.select(project.id)}
            />
          </span>
        {/snippet}
      </TooltipTrigger>
      <TooltipContent>
        <p>{t(projectMessages.select)}</p>
      </TooltipContent>
    </Tooltip>
  {/if}
{/if}
