<script lang="ts">
  import { scyllaNavigate } from '@platform/context';
  import { WidgetZone } from '@scylla/core-sdk';
  import { Card, CardTitle } from '@scylla/ui/primitives';
  import { createSelection } from '@scylla/ui/state';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import { projectPoints, type ProjectCardContext } from '../../project.points.ts';
  import type { SectionKey } from '../../presenters/project-sections.presenter.ts';
  import ProjectIcon from '../ProjectIcon/ProjectIcon.svelte';
  import ProjectCardControls from './ProjectCardControls.svelte';

  interface Props {
    project: ProjectEntity;
    /** The projects of the cards that came with this one: see `ProjectCardContext`. */
    batch?: readonly string[];
    /** The section of the page that shows the card: « Move up » and « Move down » use it. */
    section?: SectionKey;
    /** The reorder mode: the whole card is the handle, and a click does not open it. */
    reordering?: boolean;
  }

  let { project, batch, section, reordering = false }: Props = $props();

  const selection = createSelection('projects');
  const isSelected = $derived(selection.selectedIds.includes(project.id));

  const context: ProjectCardContext = $derived({
    workspaceId: project.workspaceId,
    projectId: project.id,
    projectName: project.name,
    batch: batch ?? [project.id],
    density: 'comfortable',
  });

  /** A link or a button of a part of the card does its own action: the card does not open. */
  const open = (event: MouseEvent) => {
    if (reordering || (event.target as Element | null)?.closest('a, button')) return;
    scyllaNavigate.goToProject(project.id, project.name);
  };
</script>

<Card
  data-tour="project-card"
  data-project-id={project.id}
  data-density="comfortable"
  onclick={open}
  class={cn(
    'group flex h-full flex-col justify-between gap-4 p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-lg',
    !reordering && 'cursor-pointer active:scale-[0.98]',
    isSelected && !reordering && 'border-primary ring-2 ring-primary',
  )}
>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <ProjectIcon icon={project.icon} size={36} />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <div class="flex min-w-0 items-center gap-2">
          <CardTitle class="min-w-0 truncate text-base" title={project.name}>
            {project.name}
          </CardTitle>
          <WidgetZone point={projectPoints.cardBadge} {context} />
        </div>
        <WidgetZone point={projectPoints.cardSubtitle} {context} />
      </div>
      <ProjectCardControls {project} {section} {reordering} />
    </div>

    <p class="line-clamp-2 text-sm text-muted-foreground">
      {#if project.description}
        {project.description}
      {:else}
        <span class="italic">{t(projectMessages.noDescription)}</span>
      {/if}
    </p>

    <WidgetZone point={projectPoints.cardBody} {context} />
  </div>

  <WidgetZone point={projectPoints.cardFooter} {context} />
</Card>
