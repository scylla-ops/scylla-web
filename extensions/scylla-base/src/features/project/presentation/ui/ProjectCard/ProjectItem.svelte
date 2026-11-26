<script lang="ts">
  import { scyllaNavigate } from '@platform/context';
  import { WidgetZone } from '@scylla/core-sdk';
  import { CompactCard, ListRow, Tile } from '@scylla/ui';
  import { createSelection } from '@scylla/ui/state';
  import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
  import { projectPoints, type ProjectCardContext } from '../../project.points.ts';
  import type { ProjectDensity } from '../../presenters/project-density.presenter.ts';
  import type { SectionKey } from '../../presenters/project-sections.presenter.ts';
  import ProjectIcon from '../ProjectIcon/ProjectIcon.svelte';
  import ProjectCard from './ProjectCard.svelte';
  import ProjectCardControls from './ProjectCardControls.svelte';

  interface Props {
    project: ProjectEntity;
    /** The projects of the items that came with this one: see `ProjectCardContext`. */
    batch?: readonly string[];
    section?: SectionKey;
    reordering?: boolean;
    density: ProjectDensity;
    /** A phone: a row puts its details under the name. */
    phone?: boolean;
  }

  let { project, batch, section, reordering = false, density, phone = false }: Props = $props();

  const selection = createSelection('projects');
  const selected = $derived(selection.selectedIds.includes(project.id) && !reordering);

  const context: ProjectCardContext = $derived({
    workspaceId: project.workspaceId,
    projectId: project.id,
    projectName: project.name,
    batch: batch ?? [project.id],
    density,
  });

  /** A link or a button of a part of the item does its own action: the item does not open. */
  const open = (event: MouseEvent) => {
    if (reordering || (event.target as Element | null)?.closest('a, button')) return;
    scyllaNavigate.goToProject(project.id, project.name);
  };
</script>

{#snippet small()}<ProjectIcon icon={project.icon} size={20} />{/snippet}
{#snippet large()}<ProjectIcon icon={project.icon} size={36} />{/snippet}
{#snippet badge()}<WidgetZone point={projectPoints.cardBadge} {context} />{/snippet}
{#snippet subtitle()}<WidgetZone point={projectPoints.cardSubtitle} {context} />{/snippet}
{#snippet footer()}<WidgetZone point={projectPoints.cardFooter} {context} />{/snippet}
{#snippet controls()}<ProjectCardControls {project} {section} {reordering} />{/snippet}
{#snippet menu()}<ProjectCardControls {project} {section} {reordering} select={false} />{/snippet}
{#snippet health()}
  <div class="flex max-w-full min-w-0 flex-col items-center justify-center gap-1">
    {@render badge()}
    {@render footer()}
  </div>
{/snippet}

<!-- One project in the shape of the density of its section. Each shape is an anchor of the tour. -->
{#if density === 'compact'}
  <CompactCard
    title={project.name}
    icon={large}
    {badge}
    {subtitle}
    actions={controls}
    {footer}
    {selected}
    interactive={!reordering}
    data-tour="project-card"
    data-project-id={project.id}
    data-density="compact"
    onclick={open}
  />
{:else if density === 'list'}
  <ListRow
    title={project.name}
    icon={small}
    {badge}
    {subtitle}
    meta={footer}
    actions={controls}
    stacked={phone}
    {selected}
    interactive={!reordering}
    data-tour="project-card"
    data-project-id={project.id}
    data-density="list"
    onclick={open}
  />
{:else if density === 'tiles'}
  <Tile
    title={project.name}
    icon={large}
    status={health}
    actions={menu}
    {selected}
    interactive={!reordering}
    data-tour="project-card"
    data-project-id={project.id}
    data-density="tiles"
    onclick={open}
  />
{:else}
  <ProjectCard {project} {batch} {section} {reordering} />
{/if}
